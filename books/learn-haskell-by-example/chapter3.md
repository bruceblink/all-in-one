---
sidebar_position: 4
typora-root-url: ./..\..\static
---
# 第 3 章 每一行都至关重要（Every line counts）

本章内容包括：

- 在 Haskell 中实现副作用与输入/输出
- 在含副作用的代码中使用纯（无副作用的）代码
- 与操作系统环境交互
- 在程序中加入命令行参数解析器

在上一章中，我们学习了如何编写用于字符串转换的算法，并探索了 Haskell 编程的基本概念；不过，当时我们只能在 GHCi 中测试功能。现在，我们希望将注意力转向编写第一个真正的程序——一个可以从命令行运行的程序。

在命令行中工作，或在类 Unix 系统上编写自动化脚本时，人们常常使用多个程序组成的“管道”（pipeline）来完成特定任务，比如搜索或转换数据。为了方便进程间通信，通常使用文本流（streams of text）在不同进程之间传递信息，而这通常通过管道符号 `|` 来实现。图 3.1 展示了这种通过 shell 命令和管道来转换数据的思路。

> **图 3.1** 使用 shell 管道命令转换数据的示例
>
> ![figure3-1](/img/learn-haskell-by-example/chapter3/figure3-1.png)

为了让这种机制发挥作用，Unix 环境中提供了许多工具来执行基础任务，这些工具通过管道组合起来，就能完成更复杂的操作。其中之一是 **nl**，即 “number lines” 的缩写。它的功能非常简单：打印文件内容并为每一行编号。换句话说，它能为任意文本生成一个带行号的清单。示例如下：

```shell
$ nl testFile.txt
     1  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas a
     2  mattis nisi, eleifend auctor erat. Vivamus nisl sapien, suscipit non
     3  gravida sed, mattis a velit. Fusce non iaculis urna, a volutpat leo.
     4  Ut non mauris vel massa tincidunt mattis. Sed eu viverra lectus.
     5  Donec pulvinar justo quis condimentum suscipit. Donec vel odio eu
     6  odio maximus consequat at at tellus. Ut placerat suscipit vulputate.
     7  Donec eu eleifend massa, et aliquet ipsum.
     8  Mauris eget massa a tellus tristique consequat. Nunc tempus sit amet
     9  est sit amet malesuada. Curabitur ultrices in leo vitae tristique.
    10  Suspendisse potenti. Nam dui risus, gravida eu scelerisque sit amet,
    11  tincidunt id neque. In sit amet purus gravida, venenatis lectus sit
    12  amet, gravida massa. In iaculis commodo massa, in viverra est mollis
    13  et. Nunc vehicula felis a vestibulum egestas. Phasellus eu libero sed
    14  odio facilisis feugiat id quis velit. Proin a ex dapibus, lacinia dui
    15  at, vehicula ipsum.
```

这个工具可以以多种方式使用。例如：

- 为文件的每一行编号；
- 在输出中搜索某个字符串，然后去掉匹配内容，仅保留行号；
   结果就是包含目标字符串的行号，这在查找源代码引用时非常有用；
- 另一个例子是，先创建一个数据项列表，根据某个条件进行排序，再为结果编号；
   这样可以得到一个带索引的有序清单。

那为什么不趁早试试看，用 Haskell 自己重写这样一个小工具呢？虽然只使用纯函数和简单定义的编程方式很舒服，但对于程序员来说，更有价值的是去探索如何在一个以“纯函数式编程”著称的语言中实现输入与输出（即副作用）。无副作用的函数如何与 I/O 这种典型的副作用兼容？这是我们希望在学习初期就提出并回答的问题。

当然，我们把这当作一次学习练习。真正的 `nl` 工具有许多功能，比如各种格式化选项，我们不会完全复现；但它缺少一些有趣的功能，例如**反向编号**，这是我们想要添加的。因此，让我们迈出编写“真实”程序的第一步——动手实现一个为文件行编号的工具！

本章首先介绍 **do 记法（do notation）**，并讲解如何在 Haskell 中执行输入输出操作。接着，我们将学习如何把第二章学到的语法和函数整合到这种新写法中。最后，在了解了如何与操作系统环境交互之后，我们将开始构建这个工具的基础，并在第 4 章中通过一个简单的示例程序完成它。
