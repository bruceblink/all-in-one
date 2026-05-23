---
sidebar_position: 6
typora-root-url: ./..\..\static
---


# 第6章：解决单词阶梯游戏

**本章涵盖**
*   使用多个辅助函数编写复杂的算法
*   类型变量及其作用域的复杂性
*   通过性能分析（Profiling）优化应用程序，并为项目添加外部依赖

在上一章中，我们介绍了单词阶梯游戏，并讨论了如何实现可以表示图结构的数据结构。此外，我们还可以构建一个代表游戏所有可能结果的图。

现在，我们将注意力转向解决在此图中计算解决方案的问题。我们可以使用一种搜索算法来实现这个目标，该算法将保证我们总能找到游戏的最短可能解。

本章首先讨论如何为我们的单词阶梯游戏 AI 实现广度优先搜索。然后，讨论类型变量，并介绍语言扩展。最后通过分析项目性能以及如何改进它来结束本章。

## 6.1 构建广度优先搜索

既然我们知道可以从给定的词典构建一个单词阶梯图，剩下的唯一计算复杂性任务就是在此图中进行搜索。我们的算法还有一个额外要求：它需要找到最短路径以产生最优的单词阶梯。我们的图是特殊的，因为它的边代价相同（即所有权重都相等）。在这种情况下，使用*广度优先搜索* 保证能找到最短路径！

### 6.1.1 算法概述

让我们思考一下这个图。当搜索一条路径时，我们从某个节点开始。从那里，我们需要访问它的每一个邻居，然后对于每个新节点（我们之前没有访问过的节点）的每个邻居重复此过程。执行这样的搜索时，我们会创建节点的*层级*顺序。这种顺序如图 6.1 所示。

[图 6.1 图中节点的广度优先排序]

要构建*广度优先*搜索，我们必须同时更新我们正在访问的新节点的前沿（frontier）。我们不能对每个节点都执行递归搜索，因为那将是*深度优先*搜索，即在给定节点的第一个邻居处继续搜索，而忽略了其他邻居。因此，在搜索时，我们必须跟踪当前正在访问的节点，并在每一步中更新它们。这如图 6.2 所示。

[图 6.2 广度优先搜索示例]

我们不仅要搜索路径的存在性，还要找出哪些节点属于该路径以解决单词阶梯游戏。要实现这一点，我们必须在搜索过程中保留已搜索节点的历史记录，并跟踪节点的前驱（predecessors）。要做到这一点，我们必须确保从不重复访问一个节点，因为每个节点必须有一个单一的前驱；否则，我们就需要重新搜索整个图才能找到一开始找到的实际路径。为了解决这个问题，我们可以在搜索过程中从图中删除我们看到的每个节点。这对我们的目的来说是可以接受的吗？答案是肯定的！从开始节点到结束节点的最短路径不可能两次访问同一个节点。连接同一个节点的两次访问的中间节点可以被移除，从而产生一条连接起点和终点的更短路径。这种*前驱图*的创建如图 6.3 所示。

[图 6.3 在图上搜索的示例（从1搜索到6），每一步都在构建前驱]

让我们总结一下。我们的搜索算法将需要执行以下操作：
1.  从图和起始节点作为初始前沿开始。
2.  收集前沿中每个节点的所有邻居节点。
3.  从图中删除当前前沿。
4.  将前沿中的每个节点存储为其各自邻居节点的前驱。
5.  检查目标节点是否在邻居节点中。
    a.  如果是，搜索结束，可以通过回溯前驱来找到路径。
    b.  如果否，继续搜索（步骤 2），使用邻居节点作为新的前沿。

为了一次删除多个节点，我们需要引入一个新函数来帮我们完成这个任务。类似于之前的实现，我们递归地调用 `AssocMap` 模块中的 `delete` 函数，从图中删除每个元素。此操作的代码如以下清单所示。

**清单 6.1 从图中删除多个节点的函数**
```haskell
deleteNodes :: Eq a => [a] -> DiGraph a -> DiGraph a
deleteNodes [] graph = graph                               -- #1
deleteNodes (x : xs) graph = M.delete x (deleteNodes xs graph)       -- #2
```
**#1 当没有节点需要删除时，返回原图**
**#2 从图中删除单个节点，并递归删除其余节点**

根据我们对搜索算法的描述，很明显我们需要处理某种状态。我们需要跟踪我们的前沿，但同时还要跟踪我们正在搜索的图（因为我们要从中删除节点）以及我们的前驱。

### 6.1.2 跟踪搜索状态

幸运的是，我们已经有一个可以用于此目的的类型：`DiGraph` 类型。因此，我们可以将搜索状态表示为它自己的类型，包含一个元素列表作为前沿、一个图，以及另一个用于跟踪前驱的图：

```haskell
type SearchState a = ([a], DiGraph a, DiGraph a)
```

此外，我们为搜索结果定义一个类型。它要么是不成功的，要么是成功的，返回我们能找到的前驱。假定前驱图将使我们能够回溯出一个解决方案。

```haskell
data SearchResult a = Unsuccessful | Successful (DiGraph a)
```

在实际搜索中，我们需要执行两个任务：
1.  执行实际搜索，并相应地更新状态。
2.  回溯前驱以找到搜索路径。

我们函数的通用骨架可能看起来像这样：

```haskell
bfsSearch :: Eq a => DiGraph a -> a -> a -> Maybe [a]
bfsSearch graph start end
  | start == end = Just [start]
  | otherwise =
    case bfsSearch' ([start], graph, empty) of
      Successful preds -> Just (findSolution preds)
      Unsuccessful -> Nothing
```

我们的函数应该在一个图中搜索连接 start 和 end 节点的路径。我们返回一个 `Maybe` 类型的路径，因为搜索可能会失败——在这种情况下，我们当然返回 `Nothing`。我们现在专注于实现 `bfsSearch'`。此函数旨在处理搜索状态，并返回一个告诉我们的结果：搜索是否成功以及前驱。可以使用新创建的 `deleteNodes` 函数从图中删除当前前沿。在从当前前沿的每个节点收集所有连接节点（或子节点）时，我们必须根据删除了节点的更新图来筛选它们，以确保我们不会将不属于图的节点添加到前沿。为了将所有的新节点添加为前驱，我们构建一个新的辅助函数，它将一个由节点及其连接节点组成的元组列表以相反的顺序添加到图中，从而向图中添加边，以指示哪个节点在搜索中前驱哪个节点。这些函数（旨在作为 `bfsSearch` 函数中的局部定义）如以下清单所示。

**清单 6.2 执行广度优先搜索的辅助函数**
```haskell
addMultiplePredecessors :: Eq a => [(a, [a])] -> DiGraph a -> DiGraph a
addMultiplePredecessors [] g = g
addMultiplePredecessors ((n, ch) : xs) g =
  addMultiplePredecessors xs (go n ch g)           -- #1
  where
    go n [] g = g
    go n (x : xs) g = go n xs (addEdge (x, n) g)         -- #2

bfsSearch' :: Eq a => SearchState a -> SearchResult a
bfsSearch' ([], _, preds) = Unsuccessful             -- #3
bfsSearch' (frontier, g, preds) =
  let g' = deleteNodes frontier g           -- #4
      ch =
        L.map
          (\n -> (n, L.filter (`M.member` g')    ↪        ↪     (children n g)))                                 -- #5
          frontier
      frontier' = L.concatMap snd ch           -- #6
      preds' = addMultiplePredecessors ch preds       -- #7
    in if end `L.elem` frontier'           -- #8
        then Successful preds'                       -- #9
        else bfsSearch' (frontier', g', preds')       -- #10
```
**#1 对每对节点和连接节点调用辅助函数**
**#2 递归地将每个连接节点作为原始节点的前驱添加**
**#3 如果前沿为空则返回否定结果，因为搜索不成功**
**#4 从图中删除前沿中的节点**
**#5 创建由前沿节点及其连接节点组成的对，这些连接节点是我们修改后的搜索图的成员**
**#6 连接连接节点列表，创建新的前沿**
**#7 为当前前沿中的节点添加前驱**
**#8 检查目标节点是否已在新的前沿中找到**
**#9 如果找到目标节点，返回带有前驱图的正结果**
**#10 使用新的前沿、图和前驱图递归搜索**

### 6.1.3 通过回溯找到解决方案

最后一个拼图是从前驱图中回溯以找到解决方案的回溯算法。我们知道，这个图中的节点都只有一个前驱，除了开始节点，它是唯一没有前驱的节点。这使我们能够从结束节点递归回溯到开始节点。一旦找不到更多前驱，我们就可以停止搜索。该算法的代码如以下清单所示。注意，执行搜索的辅助函数产生的解决方案是反序的。此外，要使此算法起作用，必须存在解决方案，并且我们对前驱图所做的假设必须成立！

**清单 6.3 用于在前驱图中查找路径的回溯算法**
```haskell
findSolution :: Eq a => DiGraph a -> [a]
findSolution g = L.reverse (go end)           -- #1
  where
    go x =
      case children x g of          -- #2
        [] -> [x]          -- #3
        (v : _) -> x : go v        -- #4
```
**#1 从结束节点开始回溯，并反转找到的路径**
**#2 从图中检索子节点**
**#3 返回当前节点作为单元素列表，这应该是我们搜索问题中的开始节点**
**#4 将当前节点添加到路径，并使用另一个子节点继续搜索**

现在，我们可以把所有的部分组合在一起！将清单 6.2 和清单 6.3 中的定义添加到我们的代码骨架中，并加上一个 `where` 子句，我们就得到了搜索算法的最终定义！然而，这并不会编译，相反，我们会得到一个错误：

```
• Couldn't match expected type 'a1' with actual type 'a'
  'a1' is a rigid type variable bound by
    the type signature for:
      findSolution :: forall a1. Eq a1 => DiGraph a1 -> [a1]
    at .../ladder/src/Graph.hs:...
  'a' is a rigid type variable bound by
    the type signature for:
      bfsSearch :: forall a. Eq a => DiGraph a -> a -> a -> Maybe [a]
    at .../ladder/src/Graph.hs:...
```

出于某种原因，`bfsSearch` 和 `findSolution` 的类型似乎不匹配——但为什么呢？它们不都是多态的吗？它们甚至具有相同的类型约束和名称，所以类型应该是兼容的。

## 6.2 类型变量作用域

这个错误可能令人困惑，为了理解它，我们必须覆盖一些理论基础。简单来说，这类错误是由 Haskell 处理类型变量及其作用域的方式引起的。

### 6.2.1 全称量化

为了更好地理解这个错误，让我们再次看看类型表达式。Haskell 向我们隐藏的一件事是，像这样的类型表达式其实并不存在：

```haskell
const :: a -> b -> a
```

Haskell 会以略微不同的方式看待这个类型：

```haskell
const :: forall a b. a -> b -> a
```

这被称为*全称量化*，默认情况下对包含自由类型变量的所有类型签名的最外层隐式执行。`forall` 为函数声明引入了新的类型变量供其使用。从函数声明的外部来看，这可以被认为是一个承诺：对于可能替换 `a` 和 `b` 的所有类型，该声明都成立。当我们使用这个函数时，很容易看出这个承诺是成立的：

```haskell
ghci> const (1 :: Int) ("Hello" :: String)
1
ghci> const (True :: Bool) (3.1415 :: Float)
True
ghci> const (() :: ()) ((\x -> x) :: (a -> a))
()
```

我们可以用任意类型替换 `a` 和 `b` 并且仍然得到结果。虽然这是向函数声明外部作出的承诺，然而，它却是对内部定义的*限制*。这是有道理的，因为具体类型不是由函数声明选择的，而是由函数的调用者选择的！在函数声明的内部，这些类型是固定的（有时在错误消息中称为*刚性*的）。

```haskell
f :: a -> a
f x = y
 where y = x
```

这个例子中的类型将被隐式改为 `forall a. a -> a`；因此，类型变量 `a` 被引入并且为声明固定。将被推断出 `x` 的类型是 `a`，并且由于 `y = x`，`y` 也必须是 `a` 类型。类型是正确的。但是，如果我们为 `x` 添加一个类型表达式，声明其为 `a` 类型呢？

```haskell
f :: a -> a
f x = y
 where y = (x :: a)
```

这将再次引发同样的错误。但是为什么呢？在添加隐式全称量化之后，它看起来像这样：

```haskell
f :: forall a. a -> a
f x = y
 where y = (x :: forall a. a)
```

`forall a. a -> a` 将变量 `a` 限制为对于函数的声明而言是*任意的但是固定的*。这也扩展到 `where` 子句中的声明！然而，`x` 的 `forall a. a` 承诺其可以是任何任意类型。这个承诺是对函数定义的其余部分作出的，并最终导致类型不兼容！`x` 不能同时是固定的和任意的类型！在检查这些属性时，编译器不考虑类型的名称！

### 6.2.2 语言扩展

当我们构建搜索函数时，正是这个确切的问题出现了。幸运的是，我们可以告诉 Haskell 执行*词法作用域*类型变量，这意味着当类型变量由 `forall` 引入时，它可以在函数声明的类型中被重用，并且仍然引用同一个类型。我们可以通过使用一个所谓的*语言扩展*来启用此行为。这些扩展允许我们更改 Haskell 编译器的行为，要么是全局的（通过使用编译器标志），要么是基于每个文件的。我们感兴趣的扩展名为 `ScopedTypeVariables`。我们可以通过将以下行添加到模块的开头来启用它：

```haskell
{-# LANGUAGE ScopedTypeVariables #-}

module Graph (...) where
```

这现在允许我们*显式地*在类型定义中使用 `forall` 并改变其行为。`forall` 现在引入了词法作用域的类型变量！这使我们能够构建之前那个函数，通过在最外层的类型签名中显式地量化类型变量。如以下清单所示。

**清单 6.4 使用词法作用域类型变量的示例**
```haskell
f :: forall a. a -> a        -- #1
f x = y
 where y = (x :: a)          -- #2
```
**#1 引入类型变量 a 在函数声明中使用**
**#2 引用引入的类型变量，并且不能再次被全称量化**

一个好的副作用是，对类型的约束会被*携带*到其他定义中，因此我们只需要在最外层的类型签名上应用类型约束！还要注意，没有显式使用 `forall` 的函数定义仍然表现得和以前一样。

**重要提示** `forall` 的用法是重载的，根据所使用的语言扩展具有不同的含义。除了 `ScopedTypeVariables`，还有 `RankNTypes` 和 `ExistentialQuantification`，它们对类型系统的工作方式有深远的影响。一般来说，只有在需要时才应使用显式的 `forall`！然而，`ScopedTypeVariables` 相对安全，并在许多项目中全局启用。

### 6.2.3 使用词法作用域类型变量

在修改了搜索函数的类型之后，我们得到了一个完整的（并且可以编译的）搜索算法定义！完整的源代码如以下清单所示。请注意最外层类型签名中的显式 `forall`，以及类型约束 `Eq a` 如何仅出现在这个签名中，因为类型变量 `a` 现在在整个函数声明中都是可用的。

**清单 6.5 在具有均匀权重的有向图中确定最短路径**
```haskell
type SearchState a = ([a], DiGraph a, DiGraph a)       -- #1

data SearchResult a = Unsuccessful |    ↪     Successful (DiGraph a)                           -- #2

bfsSearch :: forall a. Eq a => DiGraph a    ↪     -> a -> a -> Maybe [a]                  -- #3
bfsSearch graph start end
  | start == end = Just [start]         -- #4
  | otherwise =
    case bfsSearch' ([start], graph, empty) of              -- #5
          Successful preds -> Just (findSolution preds)       -- #6
          Unsuccessful -> Nothing
      where
        findSolution :: DiGraph a -> [a]
        findSolution g = L.reverse (go end)       -- #7
          where
            go x =
              case children x g of        -- #8
                [] -> [x]                          -- #9
                (v : _) -> x : go v       -- #10

        addMultiplePredecessors :: [(a, [a])] -> DiGraph a -> DiGraph a
        addMultiplePredecessors [] g = g
        addMultiplePredecessors ((n, ch) : xs) g =
          addMultiplePredecessors xs (go n ch g)            -- #11
          where
            go n [] g = g
            go n (x : xs) g = go n xs (addEdge (x, n) g)        -- #12

        bfsSearch' :: SearchState a -> SearchResult a
        bfsSearch' ([], _, preds) = Unsuccessful         -- #13
        bfsSearch' (frontier, g, preds) =
          let g' = deleteNodes frontier g       -- #14
              ch =
                L.map
                  (\n -> (n, L.filter (`M.member` g')    ↪        ↪     (children n g)))                                -- #15
                  frontier
              frontier' = L.concatMap snd ch                  -- #16
              preds' = addMultiplePredecessors ch preds         -- #17
           in if end `L.elem` frontier'          -- #18
                then Successful preds'            -- #19
                else bfsSearch' (frontier', g', preds')       -- #20
```
**#1 为广度优先搜索定义搜索状态类型，包含节点前沿、要搜索的图以及前驱图**
**#2 为搜索结果定义类型，要么不成功，要么成功并带有一个前驱图以在其中搜索解决方案**
**#3 显式引入词法作用域的类型变量 a**
**#4 当 start 和 end 节点相同时，返回平凡解**
**#5 执行从 start 到 end 的最短路径搜索**
**#6 返回通过回溯前驱图找到的解决方案**
**#7 从 end 节点开始回溯，并反转找到的路径**
**#8 从图中检索子节点**
**#9 返回当前节点作为单元素列表，这应该是我们搜索问题中的开始节点**
**#10 将当前节点添加到路径，并使用另一个子节点继续搜索**
**#11 对每对节点和连接节点调用辅助函数**
**#12 递归地将每个连接节点作为原始节点的前驱添加**
**#13 如果前沿为空则返回否定结果，因为搜索不成功**
**#14 从图中删除前沿中的节点**
**#15 创建由前沿节点及其连接节点组成的对，这些连接节点是我们修改后的搜索图的成员**
**#16 连接连接节点列表，创建新的前沿**
**#17 为当前前沿中的节点添加前驱**
**#18 检查目标节点是否已在新的前沿中找到**
**#19 如果找到目标节点，返回带有前驱图的正结果**
**#20 使用新的前沿、图和前驱图递归搜索**

我们已经为有向图构建了一个广度优先搜索算法，通过跟踪已访问节点、修改后的图和先前找到的前驱来寻找最短路径。从已访问节点构建一个前驱图，然后通过回溯来找到实际解。

**练习：更多搜索算法**
为了在图中的最短路径，我们使用了*广度优先搜索*；然而，还有其他搜索算法。如果我们只想找到*任意*路径而对其长度不感兴趣，*深度优先搜索*可能就足够了。此外，双向广度优先搜索是普通广度优先搜索的一种性能改进，它同时从两端执行两次搜索，一次从开始到结束，另一次从结束到开始。一旦两次搜索相遇，就找到了一个解决方案。实现这两种搜索算法！（注意，然而，双向广度优先搜索算法实现起来很棘手！）

现在，我们能够构建单词阶梯图，也可以在其中找到最短路径。现在，我们拥有了构建程序所需的全部部件！

## 6.3 使用哈希表提升性能

构建一个解决单词阶梯游戏的函数相当简单。我们只需要一个词典和一个开始和结束单词！我们可以简单地用 `mkLadderGraph` 函数构建单词阶梯图，并用我们的搜索算法寻找解决方案！该代码出现在 `Ladder` 模块中，如以下清单所示。

**清单 6.6 用于寻找单词阶梯游戏最优解的函数**
```haskell
ladderSolve :: Dictionary -> String -> String -> Maybe [String]
ladderSolve dict start end =
  let g = mkLadderGraph dict              -- #1
   in G.bfsSearch g start end        -- #2
```
**#1 从词典生成单词阶梯图**
**#2 在生成的图中执行搜索**

我们可以让程序的 `Main` 模块保持相当简单。就像我们上一章一样，如果参数数量与我们的预期不符，我们提供一个帮助文本。否则，我们只需用 `readDictionary` 操作构建词典，并用上述 `ladderSolve` 函数解决它。然后我们打印解决方案及其长度。该模块的完整代码如以下清单所示。

**清单 6.7 单词阶梯求解器的 `Main` 模块**
```haskell
module Main (main) where

import Ladder           -- #1
import System.Environment

printHelpText :: String -> IO ()         -- #2
printHelpText msg = do
  putStrLn (msg ++ "\n")
  progName <- getProgName
  putStrLn ("Usage: " ++ progName ++ " <filename> <start> <end>")

main :: IO ()
main = do
  args <- getArgs          -- #3
  case args of
    [dictFile, start, end] -> do            -- #4
      dict <- readDictionary dictFile          -- #5
      case ladderSolve dict start end of          -- #6
        Nothing -> putStrLn "No solution"
        Just sol -> do
          print sol
          putStrLn ("Length: " ++ show (length sol))
    _ -> printHelpText "Wrong number of arguments!"
```
**#1 从 Ladder 模块导入所有定义**
**#2 定义打印帮助文本的操作**
**#3 读取提供给程序的参数**
**#4 匹配是否存在正好三个参数**
**#5 从提供的文件路径读取词典**
**#6 执行最短路径搜索并报告结果**

`print` 操作只是 `show` 和 `putStrLn` 的组合，将值打印到标准输出。现在可以测试这个应用程序了！

为此，代码仓库已经准备了两个词典文件：`small_dictionary.txt`，包含 200 个单词，和 `large_dictionary.txt`，包含 58,110 个单词。在我们的项目目录中，我们现在可以像这样调用程序：

```bash
shell $ stack run -- path/to/small_dictionary.txt cat flower
["cat","oat","lot","volt","love","vowel","lower","flower"]
Length: 8
shell $ stack run -- path/to/small_dictionary.txt dog book
["dog","dot","lot","tool","look","book"]
Length: 6
```

看起来不错！那为什么不也测试一下大词典呢？好吧，可悲的是，我们无法观察到程序的全部功能，因为至少在我的机器上，它似乎没有产生结果。它花的时间太长了。我们应该想办法改进这一点。

### 6.3.1 通过性能分析 (Profiling) 分析性能

在决定我们要改进什么之前，我们应该先分析哪个操作花了这么长时间。为此，我们要对程序进行性能分析。我们首先使用 `--profile` 标志编译程序，然后设置运行时选项以进行基本的时间和内存分析，使用 `+RTS -p -RTS`。程序的完整调用如下：

```bash
shell $ stack run --profile -- \
                path/to/small_dictionary.txt dog book +RTS -p -RTS
```

程序结束后，将生成一个文件，在我们的例子中，它被称为 `ladder-exe.prof`。这个文件包含性能分析信息，看起来像这样：

```
Mon Jul 25 16:22 2022 Time and Allocation Profiling Report  (Final)

           ladder-exe +RTS -N -p -RTS path/to/small_dictionary.txt dog book

        total time  =        0.03 secs   (100 ticks @ 1000 us, 8 processors)
        total alloc =  46,192,080 bytes  (excludes profiling overheads)

COST CENTRE                  MODULE         SRC
               ↪     %time %alloc

lookup.lookup'               Data.AssocMap  src/Data/AssocMap.hs:(54,5)-(5    ↪     7,34)   54.0    0.1
computeCandidates.uniques    Ladder         src/Ladder.hs:19:7-50    ↪    
                ↪     21.0   26.9
member.member'               Data.AssocMap  src/Data/AssocMap.hs:(24,5)-(2    ↪        ↪     7,32)   14.0    0.0
alter.alter'                 Data.AssocMap  src/Data/AssocMap.hs:(33,5)-(4    ↪        ↪     3,40)    5.0   44.7
lookup                       PermutationMap src/PermutationMap.hs:31:1-34    ↪    
                 ↪     3.0   12.3
readDictionary               Ladder         src/Ladder.hs:(10,1)-(14,22)    ↪    
                 ↪     2.0    0.2
computeCandidates.perms      Ladder         src/Ladder.hs:20:7-69    ↪    
                 ↪     0.0    1.7
computeCandidates.modified   Ladder         src/Ladder.hs:(25,5)-(26,58)    ↪    
                 ↪     0.0    7.1
computeCandidates.canditates Ladder         src/Ladder.hs:18:7-57    ↪    
                 ↪     0.0    2.5
```

这是对我们程序的*成本中心*的简要概述，主要由我们的函数组成。这告诉我们每个函数花费了多少时间以及分配了多少内存。从中，我们可以看到大量时间用在了 `AssocMap` 模块中的 `lookup` 函数上。超过一半的运行时间被这个函数占用！这很有道理，因为我们不断地在我们的图中查找值，而图只是一个 `AssocMap`。所以如果我们想加速程序执行，就必须优化它！

问题是：这个函数有什么问题？它是在构成我们映射的关联列表中进行简单查找。在最坏的情况下，每次查找它都必须遍历整个列表！这意味着更大的词典会导致更大的图，从而导致在查找值上花费更多的时间。可悲的是，这就是我们使用关联列表时必须面对的慢速现实。这个缺点是其设计固有的。我们需要做的是完全用一个更快的东西来替换它。

### 6.3.2 添加项目依赖

一个很好的候选者是*哈希表*，以其快速的访问时间而闻名。但是，这次我们不打算自己构建哈希表。我们将简单地使用一个现成的！为此，我们需要将依赖项 `unordered-containers` 和 `hashable` 添加到我们的项目中。为此，我们编辑我们的 `package.yml` 文件以包含这些依赖项。文件的相关部分应该看起来像这样：

```yaml
dependencies:
- base >= 4.7 && < 5
- unordered-containers
- hashable
```

这将自动使 `stack` 负责为我们的项目下载和构建依赖项。现在，我们可以用 `Data.HashMap.Lazy` 替换我们的 `Data.AssocMap` 模块。此外，在 `Graph` 和 `PermutationMap` 模块中，我们需要将类型更改为使用 `M.HashMap` 而不是 `M.AssocMap`。一个值要成为 `HashMap` 中的键，它需要有 `Hashable` 类型类的实例。所以我们需要修改 `Graph` 模块中的类型签名，在其类型约束中包含 `Hashable a`。该类提供了一个哈希方法，用于 `HashMap` 中，可以从 `Data.Hashable` 模块导入。

**注意** 将 `AssocMap` 换成 `HashMap` 如此容易并非巧合，因为我们实际上已经实现了与哈希映射模块中相同的函数。如果你理解了 `AssocMap` 的函数是如何工作的，那么你也就知道 `HashMap` 模块是如何工作的了！

在编译并再次运行程序后，我们将能够处理甚至是大词典！再次开启性能分析运行程序，对成本中心再次审视，向我们展示了非常有趣的结果：

```
computeCandidates.uniques    Ladder                 src/Ladder.hs:19:7-50    ↪    
                                ↪     67.4   34.7
readDictionary               Ladder                 src/Ladder.hs:(10,1)-(    ↪     14,22)                   4.7    0.2
liftHashWithSalt.step        Data.Hashable.Class    src/Data/Hashable/Clas    ↪        ↪     s.hs:656:9-46            4.7    7.2
liftHashWithSalt             Data.Hashable.Class    src/Data/Hashable/Clas    ↪        ↪     s.hs:(653,5)-(656,46)    4.7    0.0
lookup#                      Data.HashMap.Internal  Data/HashMap/Internal.    ↪        ↪     hs:597:1-82              2.3    1.3
insert'.go                   Data.HashMap.Internal  Data/HashMap/Internal.    ↪        ↪     hs:(759,5)-(788,76)      2.3    1.1
```

我们的查找变得如此之快，以至于计算用于在置换映射中查找的唯一候选者似乎成了一个主要的时间消耗！幸运的是，我们可以简单地移除它，因为我们添加它仅仅是为了最小化我们需要在置换映射中执行的查找次数。既然映射实现如此之快，那就不再必要了。又一个性能改进！再次对应用程序进行分析，但这次使用大词典，我们得到了另一个令人惊讶的结果：

```
readDictionary             Ladder                 src/Ladder.hs:(10,1)-(14    ↪        ↪     ,22)                  95.7    5.5
readDictionary.words       Ladder                 src/Ladder.hs:13:7-60    ↪    
                               ↪     1.3    6.0
alter                      PermutationMap         src/PermutationMap.hs:22    ↪        ↪     :1-36                  0.4   18.5
readDictionary.lines       Ladder                 src/Ladder.hs:12:7-39    ↪    
                               ↪     0.4   14.5
insert'.go                 Data.HashMap.Internal  Data/HashMap/Internal.hs    ↪        ↪     :(759,5)-(788,76)      0.3    5.8
```

我们大部分时间都花在读取文件上！这是好消息，因为这告诉我们我们的算法相对优化了。然而，即使读取文件也有改进的余地。到目前为止，我们一直在不知不觉中愉快地使用着一个性能杀手。罪魁祸首叫做 `String`。问题在于字符串的构造，它们是 `Char` 值在列表中的单个字符。这个列表有两个主要问题：
+ 它存在于堆上；因此内存访问相当慢
+ 它被实现为链表，这对缓存局部性不利

当性能至关重要时，必须避免 `String` 类型。合适的替代品是 `text` 包中的 `Text` 类型或 `bytestring` 包中的 `ByteString`。两者都提供了更高效的、紧凑的字符串表示。它们的缺点是不能再使用我们通常的列表函数，这使得它们稍微不那么便携。我们不会详细讨论如何用更快的类型替换我们的 `String` 用法，因为性能提升是微不足道的。然而，好奇的读者可以自由地查看代码库以获取此项目的优化版本！

**重要提示** 在设计程序以获得高性能时，切换类型应该是你的*最后手段*。正确的算法和数据结构选择比技术细节重要得多。

### 6.3.3 惰性求值

在结束性能讨论之前，我们将更仔细地看看求值在 Haskell 中是如何工作的。与其他语言大不相同，Haskell 是一种具有*惰性求值*的语言。这意味着表达式不会立即被求值，而只有在它们的求值被*强制*时才会求值。让我们看下面的例子：

```haskell
ghci> :{
ghci| const :: a -> b -> a
ghci| const x _ = x
ghci| :}
ghci> x = (1000 :: Int)^(100000000 :: Int)
ghci> y = 0 :: Int
ghci> const x y
0
```

`const` 函数有两个参数，第二个参数被完全丢弃。在我们执行的求值中会发生什么？表达式 `const 0 1000^100000000` 被归约为 `0`，因为 `const x _` 被归约为 `x`。第二个参数是一个巨大的数字，应该花费很长时间来计算，被简单地丢弃了，因此根本没有被求值！你可以在附录 B 中查看更多详情。

我们的算法也利用了这种惰性求值！我们并不是在搜索解决方案之前就构建整个图；我们是在搜索的过程中构建图！只有必要的图元素被求值。然而，这只有在我们的所有数据结构都是*惰性的*时才有效。列表和我们自己定义的类型默认是惰性的。在使用哈希表提升性能时，我们特意导入了 `HashMap` 的惰性版本，它不会强制对值进行求值。

**注意** 虽然*惰性求值*似乎通常优于其对立面*严格求值*，但情况并非如此。某些算法，如本章中的搜索算法，受益于惰性，而其他算法则会出现明显的性能下降。惰性也可能导致意外的内存使用，这就是为什么一些开发者使用诸如 `StrictData` 之类的语言扩展从其项目中完全禁止它。

让我们总结一下通过完成这个项目所取得的成就。我们创建了一个人工智能，给定一个单词词典，它能够找到修改版单词阶梯游戏的最短解。我们通过实现一个可以创建代表游戏可能解的图的算法，并通过搜索这个图来找到解。为此，我们实现了自己版本的映射，使用关联列表，并将此类型的功能捆绑到其自己的模块中以供重用。基于此实现，我们创建了另一种映射类型，用于快速检索给定单词的有效置换，以使我们的程序可行。图被建模为一个邻接映射，使用我们自定义的映射实现。我们使用广度优先搜索来寻找最短路径。在测试和剖析程序后，通过将关联列表构建的映射替换为哈希映射，我们提高了其性能。

现在，我们准备好进入下一届单词阶梯世界锦标赛了！……如果存在这种东西的话。

## 总结
+   自由类型变量隐式地全称量化。
+   全称量化变量是对声明外部的一个承诺，即任何符合特定约束的类型都可以与该声明一起使用。
+   函数的调用者决定在具有全称量化变量的表达式中使用什么具体类型。
+   语言扩展可用于更改语言的默认行为，并通过 `{-# LANGUAGE … #-}` 编译指示启用。
+   我们可以通过在 `stack` 命令中使用 `--profile` 标志来启用 Stack 项目中的性能分析。
+   使用 `+RTS` 和 `-RTS`，我们可以向 Haskell 应用程序添加运行时系统选项。
+   通过将包名添加到 `package.yml` 文件的 `dependencies` 部分，可以将外部依赖项添加到我们的 Stack 项目中。
+   惰性求值意味着表达式只有在需要其结果时才会被求值。