+++
title = "装药计算代码记录"
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

```cpp
// calculate twice signed area of triangle (0,0)-(x1,y1)-(x2,y2)
// return an SOS-determined sign (-1, +1, or 0 only if it's a truly degenerate triangle)
static int orientation(double x1, double y1, double x2, double y2, double &twice_signed_area)
{
   twice_signed_area=y1*x2-x1*y2;
   if(twice_signed_area>0) return 1;
   else if(twice_signed_area<0) return -1;
   else if(y2>y1) return 1;
   else if(y2<y1) return -1;
   else if(x1>x2) return 1;
   else if(x1<x2) return -1;
   else return 0; // only true when x1==x2 and y1==y2
}

// robust test of (x0,y0) in the triangle (x1,y1)-(x2,y2)-(x3,y3)
// if true is returned, the barycentric coordinates are set in a,b,c.
static bool point_in_triangle_2d(double x0, double y0, 
                                 double x1, double y1, double x2, double y2, double x3, double y3,
                                 double& a, double& b, double& c)
{
   x1-=x0; x2-=x0; x3-=x0;
   y1-=y0; y2-=y0; y3-=y0;
   int signa=orientation(x2, y2, x3, y3, a);
   if(signa==0) return false;
   int signb=orientation(x3, y3, x1, y1, b);
   if(signb!=signa) return false;
   int signc=orientation(x1, y1, x2, y2, c);
   if(signc!=signa) return false;
   double sum=a+b+c;
   assert(sum!=0); // if the SOS signs match and are nonkero, there's no way all of a, b, and c are zero.
   a/=sum;
   b/=sum;
   c/=sum;
   return true;
}
```
