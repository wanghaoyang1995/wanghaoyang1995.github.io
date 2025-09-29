+++
title = "FCG-Chapter-4"
summary = ""
categories = ["图形学"]
tags = ["读书笔记", "图形学"]
series = []

lastmod = "2025-09-29T22:46:02+08:00"
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

