+++
title = "FCG-Chapter-4"
summary = ""
categories = ["图形学"]
tags = ["读书笔记", "图形学"]
series = []

lastmod = "2025-10-07T10:22:48+08:00"
draft = false
math = true

date = "2025-09-29T22:45:58+08:00"
archives = '2025-09'
isCJKLanguage = true
+++

### 4. 光线追踪

**渲染**是一个将输入对象进行处理、变成输出像素数组的过程。

有两种渲染方式：

- *"object-order rendering"*：每个对象依次被处理，所有被该对象影响的像素将会被查找并更新。
- *"image-order randering"*：每个像素依次被处理，所有影响到该像素的对象将会被找到并计算。

这两种方式都可以精确地获得完全相同的图像，但其计算的效果与性能十分不同。宽泛地来说，*image-order rendering*方式更容易跑起来，在可实现的视觉效果上也更灵活，并且在生成一张差不多的图像上经常（并非总是）占用更多的执行时间。

光线追踪是一种渲染3D场景的"image-order"算法，我们首先考虑它是因为，可以不用开发任何"object-order"渲染所需的数学工具。

#### 4.1 基础光线追踪算法

光线追踪器的三个部分：
1. **射线生成**：计算每个像素基于相机几何的视射线的原点与方向。
2. **射线求交**：找到视射线的最近相交物体。
3. **着色**：基于射线相交结果，计算像素颜色。

基础光线追踪程序结构：
```
for each pixel do
  compute viewing ray
  find first object hit by ray and its surface normal n
  set pixel color to value computed from hit point, lights, and n
```

#### 4.2 透视

将3D物体/场景展示在一个2D图片上，有许多不同的方式：

**线性透视(Linear Perspective)**：场景中的直线在图片中仍是直线。  
**平行透视(Parallel Projection)**：3D点将被移动到其2D投影位置上。

平行透视中有两种情况：当投影平面与视方向垂直时，这种投影称为**正交投影(Orthographic)**，否则称为**斜投影(Oblique)**

平行透视常被用于机械、建筑制图中，因为它使3D场景中的平行线投影后仍然平行，且能保证与投影平面平行的物体尺寸不变。  
但其缺点是未遵循人眼直觉中的“近大远小”，使得平行线“看起来不平行”。

**透视投影(Perspective Projection)**是一种计算透视的数学方法，它可以产生符合人眼直觉的图像。

#### 4.3 计算视射线

从人眼\(e\)出发、经过一点\(s\)的射线可由下式表示：
$$\textbf{p}(t)=\textbf{e}+t(\textbf{s}-\textbf{e})$$

一个面向对象的程序中，我们可能会这样表示：
```
class Ray
    Vect3 o | ray origin
    Vect3 d | ray direction
    Vect3 evaluate(real t)
        return o + t*d
```

**相机坐标系**：\(\textbf{e}\)作为原点，视线方向为\(-\textbf{w}\)，“上方”向量(up vector)为\(\textbf{v}\)，可构造右手坐标系的三个基向量\(\textbf{u},\textbf{v},\textbf{w}\)。

{{< figure src="camera_frame.jpg" caption="相机坐标系" class="center-figure" width="200" >}}

##### 4.3.1 正交视图

在正交视图中，所有射线都朝向\(-\textbf{w}\)。尽管平行视图中不存在*视点*(Viewpoint)，我们仍然可以使用相机坐标系。

图像位置由四个参数定义：*l，r，b，t* 分别表示图像左边线、右边线的坐标位置（\(\textbf{u}\)坐标分量），下边线、上边线的坐标位置(\(\textbf{v}\)坐标分量)。  
通常 \(l < 0 < r\) 且 \(b < 0 < t \) 。

{{< figure src="projection.jpg" caption="相机坐标系" class="center-figure" width="450" >}}

在相机坐标系下，图片像素\((i,j)\)的坐标可按下式计算：
$$u=l+(r-l)(i+0.5)/n_x$$
$$v=b+(t-b)(j+0.5)/n_y$$

在正交视图中，可以把图片像素位置当做射线原点，正交视图下的射线生成如下：

compute u and v of a pixel  
ray.\(\textbf{o}\) ← \(\textbf{e}\) + u\(\textbf{u}\)+v\(\textbf{v}\)  
ray.\(\textbf{d}\) ← -\(\textbf{w}\)

(译注：按个人理解，\(e\)的绝对位置不重要，只要保证它不穿越到图片另一侧。射线起点在每个像素位置上)

要实现斜平行视图，只需要将图片平面法向\(\textbf{w}\)与射线方向\(\textbf{d}\)分开处理即可。

##### 4.3.2 透视视图

**图片平面距离/焦距(Image Plane Distance)**：视点到图片平面的距离。

射线计算过程：

compute u and v of a pixel  
ray.\(\textbf{o}\) ← \(\textbf{e}\)  
ray.\(\textbf{d}\) ← -d\(\textbf{w}\) + u\(\textbf{u}\)+v\(\textbf{v}\)

和平行投影一样，斜透视视图可以通过将图片法向与投影方向分开处理来实现。

（译注：在什么情况下会使用斜透视？）

#### 4.4 射线-物体求交

##### 4.4.1 射线与球相交
