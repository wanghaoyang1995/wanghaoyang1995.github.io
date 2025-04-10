+++
title = "射线交叉法判断点是否位于几何体内部"
summary = ""
categories = ["杂项"]
tags = []
series = []

lastmod = "2025-04-09T23:51:57+08:00"

date = "2025-04-09T23:51:57+08:00"
archives = '2025-04'
isCJKLanguage = true

params.math = true
+++

**射线交叉法**可以用来计算一点是否在几何体内部，在本文中用于初始化有符号距离场的符号。其思路是，从网格内每一个点开始，沿x轴正向（沿任意一个方向均可）发出一条射线，判断这条射线穿过几何表面的次数，奇数次为内部点，偶数次为外部点。

下面先贴出来计算用到的概念和公式。

#### 叉积/向量积/外积
三维空间中两个向量的叉积：

$$\textbf{u} \times \textbf{v} = |\textbf{u}||\textbf{v}|\sin\theta\textbf{n}$$

矩阵表示：
$$\textbf{u} \times \textbf{v} =
\begin{bmatrix}
\textbf{i} & \textbf{j} & \textbf{k} \\
u_1 & u_2 & u_3 \\
v_1 & v_2 & v_3
\end{bmatrix}
$$

**几何意义**：叉积的结果是一个向量，模长等于两个向量为边所构成的平行四边形的面积，方向与两向量垂直，由右手定则决定。

#### 有向面积

平面中\(\Delta{ABC}\)，其中点\(A(x_A, y_A)\)，\(B(x_B, y_B)\)，\(C(x_C, y_C)\)。三角形的有向面积计算公式：

$$S_\Delta = \frac{1}{2}
\begin{vmatrix}
x_A & y_A & 1 \\
x_B & y_B & 1 \\
x_C & y_C & 1
\end{vmatrix}
$$

若A、B、C是逆时针方向排列，则三角形的有向面积是正的，顺时针为负，三点共线则为零。

**应用**：判断点D是否在\(\Delta{ABC}\)内部。

方法1（符号法）：连接DA、DB、DC，若\(\Delta{DAB}\)、\(\Delta{DBC}\)、\(\Delta{DCA}\)的有向面积与\(\Delta{ABC}\)的有向面积符号相同，则点D在\(\Delta{ABC}\)内部。

方法2（面积法）：当D在三角形ABC内部或边界上时，当且仅当\(S_{\Delta{ABC}}=S_{\Delta{DAB}}+S_{\Delta{DBC}}+S_{\Delta{DCA}}\)

#### 三角形内一点的重心坐标

在三角形ABC中，对于三角形内任意一点P，存在一组实数\((\lambda_A,\lambda_B,\lambda_C)\)满足\(\lambda_A+\lambda_B+\lambda_C=1\)，并且点P的位置可以通过如下关系定义：

$$\overrightarrow{OP}=\lambda_A\overrightarrow{OA}+\lambda_B\overrightarrow{OB}+\lambda_C\overrightarrow{OC}$$

其中O是平面内任选的参考点，通常选三角形某个顶点以便于计算。这组实数\((\lambda_A,\lambda_B,\lambda_C)\)就是P点关于三角形ABC的重心坐标。

**重心坐标与面积比之间的关系**：P点关于三角形ABC的重心坐标中每个分量之比，等于P所在三个小三角形与该大三角形的面积之比：

$$S_{\Delta{PBC}}:S_{\Delta{PCA}}:S_{\Delta{PAB}}=\lambda_A:\lambda_B:\lambda_C$$

#### 代码实现

---

> - 输入一点p，以及一个封闭STL实体，以及一个包围盒内的网格节点。对每一个节点：
> - &nsp遍历每一个三角面片，对每一个面片：
> - 在x轴方向正投影平面上，判断点P是否在三角形内部。如果否，标记该节点为外部点并返回。
> - 如果是内部，就计算它的重心坐标分量比（面积比），此时我们已知了交点的y,z坐标，需要进一步求出交点x坐标。
> - 用重心坐标定义，求出交点的x坐标。
> - 判断P的x坐标与交点x坐标的大小，可知道该点位于面片前方还是后方，只对前一种情况统计穿过次数。
> - 统计穿过次数，如果为偶数，则标记该节点在几何体外部；奇数为内部。
> - 符号场初始化完成。

每一个节点的判断逻辑是独立的，很容易用GPU并行实现。

---

```cpp
#include <gtest/gtest.h>

#include "../define.h"
#include "../stl.h"

// 计算三角形 (0, 0) (x1, y1) (x2, y2) 的有向面积
int orientation(float x1, float y1, float x2, float y2, float& twice_signed_area) {
    twice_signed_area = x1 * y2 - x2 * y1;
    if (twice_signed_area > 0) return 1;
    else if (twice_signed_area < 0) return -1;
    else return 0;
}

// 判断平面上一点P(x0, y0)是否在三角形ABC内部, 其中 A(x1, y1), B(x2, y2), C(x3, y3)
// 如果在内部, 顺便计算其重心坐标(lambda_a, lambda_b, lambda_c), 其中 lambda_a + lambda_b + lambda_c = 1
// 重心坐标与面积存在关系 lambda_a : lambda_b : lambda_c = Spbc : Spca : Spab
bool point_in_triangle_2d(float x0, float y0, float x1, float y1, float x2, float y2, float x3, float y3, float& lambda_a, float& lambda_b, float& lambda_c) {
    // 将坐标原点移到x0, y0, 简化处理
    x1 -= x0; x2 -= x0; x3 -= x0;
    y1 -= y0; y2 -= y0; y3 -= y0;

    int sign1 = orientation(x2, y2, x3, y3, lambda_a);  // 三角形PBC 的有向面积*2
    if (sign1 == 0) return false;  // 在边上, 认为不在三角形内部
    int sign2 = orientation(x3, y3, x1, y1, lambda_b);  // 三角形PCA
    if (sign2 != sign1) return false;  // 符号不同, 在三角形外部
    int sign3 = orientation(x1, y1, x2, y2, lambda_c);  // 三角形PAB
    if (sign3 != sign1) return false;  // 符号不同, 在三角形外部

    // 面积比归一化为重心坐标
    float sum = lambda_a + lambda_b + lambda_c;
    lambda_a /= sum;
    lambda_b /= sum;
    lambda_c /= sum;

    return true;
}

// 从p点出发, 沿x正向发出射线, 判断是否与三角面片相交, 如果相交则计算其交点位置
bool ray_casting(const Vertice& p, const Triangle& tri, Vertice& intersection) {
    float lambda_a, lambda_b, lambda_c;
    // 判断点与三角形在x方向的正投影有没有相交
    if (point_in_triangle_2d(p.y, p.z,
                         tri.vertices[0].y, tri.vertices[0].z,
                         tri.vertices[1].y, tri.vertices[1].z,
                         tri.vertices[2].y, tri.vertices[2].z,
                         lambda_a, lambda_b, lambda_c)) {
        intersection.x = lambda_a * tri.vertices[0].x + lambda_b * tri.vertices[1].x + lambda_c * tri.vertices[2].x;
        intersection.y = lambda_a * tri.vertices[0].y + lambda_b * tri.vertices[1].y + lambda_c * tri.vertices[2].y;
        intersection.z = lambda_a * tri.vertices[0].z + lambda_b * tri.vertices[1].z + lambda_c * tri.vertices[2].z;

        return intersection.x > p.x;  // 射线沿x轴正方向行走, 面片如果在p的左侧, 则不算穿过
    }
    return false;
}

TEST(SDFTest, test_ray_casting) {
    std::vector<::Triangle> triangles;
    Vertice min_bound, max_bound;
    STL::read_binary_stl("../data/grain_bin.stl", triangles, min_bound, max_bound);
    EXPECT_EQ(triangles.size(), 780);

    Vertice p((max_bound - min_bound)*0.5);
    printf("p (%f, %f, %f)\n", p.x, p.y, p.z);

    uint count = 0;
    for (int i = 0; i < triangles.size(); i++) {
        Vertice intersection;
        if (ray_casting(p, triangles[i], intersection)) {
            printf("\nintersection %d:\n", count);
            printf("\tintersection (%f, %f, %f)\n", intersection.x, intersection.y, intersection.z);
            printf("\ttriangle A(%f, %f, %f) B(%f, %f, %f) C(%f, %f, %f)\n\n",
                   triangles[i].vertices[0].x, triangles[i].vertices[0].y, triangles[i].vertices[0].z,
                   triangles[i].vertices[1].x, triangles[i].vertices[1].y, triangles[i].vertices[1].z,
                   triangles[i].vertices[2].x, triangles[i].vertices[2].y, triangles[i].vertices[2].z
                   );
            count++;
        }
    }

    printf("count=%d\n", count);
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
```

#### 一个问题，刚好落在三角形边上的点算不算穿过面片？

1. 按上面的代码实现是不算，但有潜在问题 ：

**潜在问题**：刚好穿过边的的顶点会被认为在面片外部，可能造成内部节点被错误标记成外部。

**解决办法**：在多个方向作同样的射线交叉检测，只要某一个方向的判断结果为内部，就认为它在内部。理论上仍不能完全避免网格节点与面片节点刚好三个方向都重合的极端情况。

2. 如果也算内部，那可能出现一个点被判定与两个相邻面片同时相交的问题，造成统计出来的计数比真实情况高，也是问题。
