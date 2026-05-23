---
sidebar_position: 7
typora-root-url: ./..\..\static
---


# 第7章：处理 CSV 文件

**本章涵盖**
*   Haskell 的记录语法及其使用方法
*   使用*智能构造器*来安全地创建满足特定属性的数据结构
*   为类型类创建实例
*   定义您自己的类型类并提供默认实现

在上一章中，我们处理了一个搜索问题，并为一个小游戏编写了强大的人工智能。然而在本章中，我们想要处理一些严肃的事务，没有什么比电子表格更能代表严肃的事务了！别担心，我们不会直接处理任何数据。作为程序员，我们显然想要自动化这些任务，而我们处理电子表格形式数据的最简单方法是使用逗号分隔值（CSV）文件。

在本章中，我们将介绍如何解析此类文件，从中提取有意义的数据，并有效地处理结构化数据。我们将学习如何泛化数据的附加和切片操作，以及如何引入类型类来帮助我们编写程序。

本章首先介绍 CSV 文件以及如何使用 Haskell 的记录语法对其进行建模。我们将学习如何使用 `Either` 类型对错误进行编码。我们将介绍美元符号运算符（`$`）和某些语言扩展，以简化我们的语法。之后，我们将创建自己的类型类，以泛化我们数据类型的用例。在此过程中，我们将学习 `Semigroup` 和 `Monoid` 类型类，它们代表什么以及它们的用途。

## 7.1 为 CSV 数据建模

在本章中，我们希望从命令行处理 CSV 文件。虽然这些文件对人类来说解析起来并不太难，但一旦它们变得很大，处理起来就非常繁琐。这通常迫使我们求助于某种带有图形用户界面的工具来处理数据。我们可以做得更好！我们的工具将具有许多功能来显示和转换这种表格数据。这些功能包括：
+   读取 CSV 文件并将其打印为 ASCII 表格，支持带或不带标题的文件
+   追加两个 CSV 文件
+   通过搜索词过滤表中的行
+   可能将表裁剪到特定的列范围
+   计算每列中的非空行数，并在打印的表中查看结果
+   或者，将转换结果以 CSV 格式写入文件

作为一个小例子，让我们看看如果我们的程序（我们将称之为 `csview`）读取一个文件，搜索一个字符串，并切分一些列，会是什么样子：

```bash
shell $ head -n 4 cities.csv
"LatD","LatM","LatS","NS","LonD","LonM","LonS","EW","City","State"
   41,    5,   59, "N",     80,   39,    0, "W", "Youngstown", OH
   42,   52,   48, "N",     97,   23,   23, "W", "Yankton", SD
   46,   35,   59, "N",    120,   30,   36, "W", "Yakima", WA
shell $ csview --in=cities.csv --with-header --search=Ya --slice="8,10"
-------------------
| City    | State |
+---------+-------+
| Yankton | SD    |
| Yakima  | WA    |
-------------------
```

在开始构建这样的工具之前，我们必须先了解这种文件格式。

CSV 文件是包含*数据记录*行的简单文本文件。这些记录包含逗号分隔的值，因此 CSV 文件包含逗号分隔值的行。此外，第一行可以（可选地）被认为是标题，为列提供名称。听起来够简单，不是吗？

遗憾的是，尽管文件格式在某种程度上是固定的（RFC 4180 给出了其建议的规范），但似乎每个实现都使用自己规则来构建 CSV 文件。与 CSV 文件相关的一些常见约束包括它们：
+   是使用常见字符编码（UTF-8、ASCII 等）的纯文本
+   每行包含一个由换行符分隔的记录
+   使用相同的分隔符（不必是逗号）在整个文件中划分记录的字段
+   每个记录具有相同数量的字段
+   可能包含一个可选的标题行
+   可能使用双引号对字段进行引用

因此，一个旨在检查和分析此类文件中数据的工具必须有一些选项来处理解析其内容的各种不同方式。让我们讨论一下应用程序的目标及其应执行的操作。我们想要一个能够读取 CSV 文件并以表格形式打印它们的应用程序。此外，我们还想搜索值并计算数据的统计数据。工作流程如下所示：
1.  读取参数并推断解析选项和请求的功能。
2.  将 CSV 文件解析为数据结构。
3.  对数据执行搜索和/或计算统计数据。
4.  将数据写回文件。
5.  可选地，以人类可读的形式打印信息。

在我们担心从命令行读取参数之前，我们应该首先定义如何在我们的程序中表示 CSV 文件，然后讨论解析！

### 7.1.1 记录语法

我们一如既往地首先使用 `stack new csview` 创建一个新项目。正如我们讨论过的，CSV 文件包含文本。在这个项目中，我们想偏离使用 `String` 类型，而采用一种在 Haskell 中处理文本的更常见方式：`Text` 类型，它是一种性能更好、紧凑的字符序列表示。要使用此类型，我们首先必须将 *text* 包纳入我们的项目。我们编辑 package.yaml 文件中的依赖项部分以包含此包。顺便一提，我们还可以更改可执行文件的名称并删除 `-exe` 后缀。稍后，我们希望将此应用程序本地安装在我们的机器上，因此更好的名称可能更合适！

```yaml
dependencies:
- base >= 4.7 && < 5
- text
...
executables:
  csview:
    main:                Main.hs
    ...
```

`Text` 数据类型可以从 `Data.Text` 模块导入，该模块包含大量处理文本的函数，因为我们不能再使用 `Data.List` 中的函数了。要执行从 `String` 到 `Text` 及反向的转换，我们可以使用 `pack` 和 `unpack` 函数：

```haskell
ghci> import Data.Text
ghci> myString = "Hello Text"
ghci> :t pack myString
pack myString :: Text
ghci> :t unpack (pack myString)
unpack (pack myString) :: String
```

该模块包含许多函数，用于替换我们从 `Data.List` 模块通常获得的功能，如 `null` 或 `length`。为了简洁起见，我们将阅读该模块的一些文档（可以在 [https://mng.bz/1a8n](https://mng.bz/1a8n) 找到）以获得对数据类型的更好感受，留给读者自己完成。

现在，我们已经准备好考虑在我们的程序中对 CSV 文件进行建模。由于 CSV 文件通常不是类型化的，其中的值可以被视为文本，无论其内容是什么。然而，稍后我们假设 CSV 文件包含数字或文本信息，以便我们可以随后构造搜索字符串和求和数字等算法。此类文件中的列以及可选的标题可以用简单的列表表示。因此，我们可以创建一个如下所示的类型：

```haskell
type Column = [Text]

type Csv = (Maybe [Text], [Column])
```

在此类型中，元组的第一个元素是可选的（由 `Maybe` 表示）标题，第二个元素表示文件的列，每列是一个字段列表。基于此定义，我们可以定义从中检索值的函数：

```haskell
header :: Csv -> Maybe [Text]
header = fst

columns :: Csv -> [Column]
columns = snd
```

我们之前在第六章中见过 `snd`。回顾一下，`fst` 检索元组的第一个元素，`snd` 检索元组的第二个元素。这些定义看起来不错，但我们可以做得更好。我们面临一些问题：
+   该类型是一个类型同义词，因此我们无法通过模块的导出列表隐藏其构造。
+   每次我们扩展该类型时，都需要更改访问其元素的函数或构造更多函数。
+   没有代码中的注释，不清楚元组中的字段代表什么。

幸运的是，我们可以通过使用 Haskell 的*记录语法*来绕过这些问题。它使我们能够为数据构造函数的字段命名。让我们通过正确定义类型来查看该语法的实际应用，同时在此过程中派生一个 `Show` 实例。该类型的代码以及一个新的名为 `Csv.Types` 的模块如下面清单所示。

**清单 7.1 使用记录语法的 CSV 文件内容数据类型**
```haskell
module Csv.Types where

import qualified Data.Text as T      -- #1

type Column = [T.Text]

data Csv = Csv      -- #2
  { csvHeader :: Maybe [T.Text],      -- #3
    csvColumns :: [Column]
  }
  deriving (Show)      -- #4
```
**#1 导入 Data.Text 并给它别名 T**
**#2 定义带有单个构造函数的 Csv 类型**
**#3 为 Csv 构造函数定义两个字段**
**#4 派生新类型的 Show 实例**

我们为 `Data.Text` 创建了一个限定的导入，因为它包含许多函数，其名称会与 `Prelude` 导入冲突。正如我们所见，记录语法允许我们按名称识别 `data` 构造函数的字段！这还有一个额外效果：字段的名称作为从数据类型中检索该字段的函数。这些被称为*字段选择器*：

```haskell
ghci> :{
ghci| data Record = Record
ghci|   { field1 :: Int,
ghci|     field2 :: String
ghci|   }
ghci| :}
ghci> :t field1
field1 :: Record -> Int
ghci> :t field2
field2 :: Record -> String
ghci> field1 (Record {field1 = 1, field2 = ""})
1
```

这意味着如果我们通过添加新字段来扩展此数据类型，我们将自动添加一个用于检索该字段的新函数！此外，我们的类型现在捆绑了最小的文档版本，因为名称表明了字段的用途。最后，由于我们现在有了类型的构造函数，我们可以将其从模块的导出中排除（类似于我们在第五章中对 `AssocMap` 类型所做的操作），以确保无法使用无效数据构造值。

**注意** 由于字段名称创建了函数，这些函数的名称可能会发生冲突。当使用相同字段名称的记录时，我们在将它们导入模块时必须非常小心。标准的做法是为字段名称加上一些标识性的缩写（例如，使用 `csvHeader` 或 `csv_header` 而不是 `header`）。

当使用记录语法构造值时，我们可以像前面的示例那样显式地命名字段及其值，或者我们可以简单地按照字段顺序将值作为构造函数的字段写下：

```haskell
ghci> data Record = Record {field1 :: Int, field2 :: String} deriving Show
ghci> Record {field1 = 100, field2 = "Hello"}
Record {field1 = 100, field2 = "Hello"}
ghci> Record 100 "Hello"
Record {field1 = 100, field2 = "Hello"}
```

当只提供部分字段时，我们会看到与我们已知的代数数据类型构造函数类似的行为。它们是部分应用的，并求值为一个函数，一旦所有缺失的字段都提供了，该函数将求值为记录类型：

```haskell
ghci> :t Record
Record :: Int -> String -> Record
ghci> :t Record 100
Record 100 :: String -> Record
```

重要的是要注意，同时使用未命名字段和命名字段来构造数据类型是不支持的：

```haskell
ghci> Record 100 {field2 = "Hello"}

<interactive>:25:8: error:
    • Couldn't match expected type ‘Int’ with actual type ‘Record’
    • In the first argument of ‘Record’, namely
        ‘100 {field2 = "Hello"}’
      In the expression: Record 100 {field2 = "Hello"}
      In an equation for ‘it’: it = Record 100 {field2 = "Hello"}
```

记录也可以通过显式命名字段并为其指定一个值来修改现有记录：

```haskell
ghci> :{
ghci| f :: Record -> Record
ghci| f rec = rec {field1 = 0}
ghci| :}
ghci> f (Record 100 "Hello")
Record {field1 = 0, field2 = "Hello"}
```

我们在这里没有明确涵盖的一点是，记录语法可以与多个构造函数一起使用，为每个构造函数使用不同的字段。然而，它的工作方式与单构造函数记录类似，但存在部分字段选择器的额外问题，这将在第10章中讨论，通常应避免。

### 7.1.2 使用 Either 编码错误

正如我们在本章开始时暗示的那样，我们稍后希望使用 `Csv` 类型，在其中搜索文本或计算总和。为此，我们必须区分表中代表文本的值和代表数字的值。我们可以通过使用一种新的类型来实现，该类型对我们的数据字段进行编码，如下面清单所示。

**清单 7.2 用于 CSV 表中字段的数据类型**
```haskell
data DataField
  = IntValue Int      -- #1
  | TextValue T.Text      -- #2
  | NullValue      -- #3
  deriving (Eq, Show)
```
**#1 定义 Int 值的构造函数**
**#2 定义 Text 值的构造函数**
**#3 定义空值的构造函数**

一个 `Csv` 表填充的不是任意数据，而是 `DataField` 值。我们 `Csv` 类型的最终版本如下面清单所示。

**清单 7.3 用于 CSV 表的数据类型**
```haskell
type Column = [DataField]      -- #1

data Csv = Csv
  { csvHeader :: Maybe [T.Text],      -- #2
    csvColumns :: [Column]      -- #3
  }
  deriving (Show)
```
**#1 定义 Column 为 DataField 值的列表**
**#2 定义标题的记录字段**
**#3 定义列的记录字段**

这使我们能够自由地包含文本和数值在表中，甚至可以在列内混合这些值。

接下来，我们来看一下 `Csv` 类型的构造函数，以及我们如何确保只有合理的数据才能用它们构造出来。

## 7.2 智能构造器

有时，我们想为类型指定某些属性，而这些属性无法通过类型系统本身来保证。在我们的例子中，标题中的字段数需要等于列数，并且每列也需要具有相同数量的元素。在第五章中处理 `AssocMap` 类型时，我们完全禁止直接构造该类型的值，并使其只能通过我们导出的某些函数来构造。然而，对于 CSV 的情况，我们希望允许这样做，但我们希望进行某种错误检查。这确保我们不必在处理该类型的每个函数中都检查这些不变量。这就引出了*智能构造器*的话题。

### 7.2.1 在构造时确保属性

我们可以通过只允许一个专用的函数来构建 `Csv` 值，该函数会检查参数的有效性，从而确保这些属性。通常，这个函数会在出问题时使程序崩溃，我们也会这样做，但我们想要一个*安全*的版本。该函数应该是什么样子？

```haskell
mkCsv :: Maybe [T.Text] -> [Column] -> ???
```

`Maybe Csv` 似乎是一个明智的选择，但仅仅在没有让用户知道出了什么问题的情况下静默失败是不礼貌的。我们希望有一个类型能返回特定的错误或实际的 `Csv` 值。这样的类型可能看起来像这样：

```haskell
data ErrorOrCsv a = Error String | Value Csv
```

幸运的是，已经存在一个具有此功能的类似类型，称为 `Either`！

```haskell
data Either a b = Left a | Right b
```

这个类型可以以多种方式使用，但它最常用于编码错误的可能性。在这种情况下，`Right` 编码一个正确的值，`Left` 编码一个错误值。因此，如果我们想要要么有一个错误消息，要么有一个值，我们可以像这样编码它：

```haskell
type ErrorOrValue a = Either String a
```

正是这个类型，我们可以用于我们的函数！我们可以快速地检查输入中的标题长度是否与列数匹配。此外，我们必须检查每列是否具有相同的长度。我们可以使用 `Data.List` 模块中的 `nubBy` 函数来实现这一点。它的功能与 `nub` 相同，但接收一个二元函数作为谓词，用于确定列表中的两个值何时相等。如果此函数的结果长度小于或等于 1，我们就知道所有列具有相同数量的元素。如下面清单所示。

**清单 7.4 安全构造 CSV 值的函数**
```haskell
mkCsv :: Maybe [T.Text] -> [Column] -> Either String Csv
mkCsv mHeader columns
  | not headerSizeCorrect =      -- #1
      Left "Size of header row does not fit number of columns"
  | not columnSizesCorrect =      -- #2
      Left "The columns do not have equal sizes"
  | otherwise = Right Csv    ↪        ↪     {csvHeader=mHeader, csvColumns=columns}      -- #3
  where
    headerSizeCorrect =      -- #4
      M.maybe True (\h -> L.length h == L.length columns) mHeader
    columnSizesCorrect =      -- #5
      L.length (L.nubBy (\x y -> length x == length y) columns) <= 1
```
**#1 如果标题大小不正确，返回错误信息**
**#2 如果列大小不正确，返回错误信息**
**#3 如果参数有效，返回一个包含这些字段的 CSV 值**
**#4 检查标题的大小是否等于列的数量**
**#5 检查所有列的大小是否相同**

在此，我们假设 `M` 是 `Data.Maybe` 的限定导入。对于本书的其余部分，我们将为代码假定一些限定导入。`T` 代表 `Data.Text`，`L` 代表 `Data.List`，`M` 代表 `Data.Maybe`，`E` 代表 `Data.Either`。

### 7.2.2 提供不安全的替代方案

回到代码，这个函数可以被认为是“安全的”，因为如果部分或全部参数无效，它不会使程序崩溃。就像 `Maybe` 一样，我们将错误的可能性编码在类型中。然而，这个函数要求我们在每次使用该函数时对类型进行模式匹配，即使我们已经确定不变量得到了满足。为了让生活更轻松，我们创建了此函数的“不安全”版本，如果参数不是我们所期望的，它只会使程序崩溃。

**注意** 在某些代码库中，“安全”函数名称带有特殊前缀，而“不安全”函数则没有。在我们的例子中，我们给不安全函数起一个像 `unsafeName` 这样的名字，以表示使用它们带来的严重危险。

为了实现这一点，我们使用 `error` 函数，它会引发异常：

```haskell
ghci> :t error
error :: GHC.Stack.Types.HasCallStack => [Char] -> a
ghci> error "Oh no!"
*** Exception: Oh no!
CallStack (from HasCallStack):
  error, called at <interactive>:... in interactive:Ghci1
```

就像 `Maybe` 类型有其自己的 `Data.Maybe` 模块和 `maybe` 函数以便快速处理它一样，`Either` 也是如此：

```haskell
ghci> import Data.Either
ghci> :t either
either :: (a -> c) -> (b -> c) -> Either a b -> c
```

`either` 函数接收两个函数，一个用于 `Left` 情况，一个用于 `Right` 情况，最终产生某个共同类型的值。在我们的例子中，我们可以通过为 `Left` 情况使用 `error` 函数，为 `Right` 情况使用 `id` 函数来构造 `unsafeMkCsv`，`id` 函数只是返回其参数。结果的一行代码如以下清单所示。

**清单 7.5 如果 CSV 值的参数无效则崩溃的不安全函数**
```haskell
unsafeMkCsv :: Maybe [T.Text] -> [Column] -> Csv
unsafeMkCsv header columns =
  E.either error id (mkCsv header columns)      -- #1
```
**#1 要么在从 safeMkCsv 得到失败结果时引发异常，要么返回其结果**

此函数只能产生正确类型的 `Csv` 结果，否则会使程序崩溃。

**警告** `error` 函数只能用于表示无法从中恢复的严重编程错误。不要随意使用它，因为它旨在使程序崩溃。

现在，我们可以测试我们的智能构造器：

```haskell
ghci> :set -XOverloadedStrings
ghci> int x = IntValue x
ghci> mkCsv (Just ["First", "Second"]) [[int 1, int 2], [int 3, int 4]]
Right (Csv {csvHeader = Just ["First","Second"], csvColumns =    ↪        ↪     [[IntValue 1,IntValue 2],[IntValue 3,IntValue 4]]})
ghci> mkCsv (Just ["First", "Second"]) [[int 1, int 2], [int 3]]
Left "The columns do not have equal sizes"
ghci> mkCsv (Just ["First"]) [[int 1, int 2], [int 3, int 4]]
Left "Size of header row does not fit number of columns"
ghci> unsafeMkCsv Nothing [[int 1, int 2], [int 3]]
*** Exception: The columns do not have equal sizes
```

但是我们应该使用哪个构造器呢？`unsafeMkCsv` 有一个固有的问题，即产生一个（如果不捕获的话）会使程序崩溃的异常。如果我们想保持安全，我们应该使用 `mkCsv`。只有当我们已经知道不会出问题（因为我们在某个其他点已经检查过了）时，`unsafeMkCsv` 才有帮助。

正如你从前面的例子中看到的，我们可以使用通常的方式写下 `String` 值来声明一个 `Text` 值。我们稍后会看到这是为什么。首先，我们得处理一些语法糖。

### 7.2.3 美元符号运算符

`unsafeMkCsv` 函数展示了一种我们经常看到的代码模式。一个函数被提供了几个参数，而最后一个参数本身是一个表达式：

```haskell
E.either error id (mkCsv header columns)
```

当最后一个表达式变得更大时，这会变得相当繁琐。幸运的是，我们可以使用一个我们尚未见过的新运算符：`$`。这个运算符在复杂性上有所欠缺，但在优雅和简洁性上却绰绰有余。它的完整定义如下面清单所示。

**清单 7.6 Haskell 的美元符号运算符**
```haskell
($) :: (a -> b) -> a -> b
($) f x = f x
```

`$` 运算符只是将一个函数应用于一个值！它可以用来优雅地写出函数应用，而不需要在其最后一个参数上使用括号：

```haskell
ghci> either (+1) (*2) (Right 100) :: Int
200
ghci> either (+1) (*2) $ Right 100 :: Int
200
```

当参数变成大项时，这非常有帮助：

```haskell
someFunc ... =
  someOtherFunc ... $
    anotherFunc ... $
      yetAnotherFunc ... $
        andYetAnotherFunc ...
```

然而，这还不是全部：

```haskell
ghci> :i ($)
($) :: (a -> b) -> a -> b
infixr 0 $
```

当我们获取有关此运算符的更多信息时，我们看到一个奇怪的注释：`infixr 0 $`。这告诉我们，这个运算符是以*中缀*风格书写的，具有*右结合性*（由 `infix` 后面的 `r` 表示），并且具有额外的*优先级* 0。右结合性意味着如果有多个具有相同优先级的运算符，操作会从右侧分组。优先级 0 指定其他运算符优先于 `$`（除非它们也具有优先级 0）。为什么这很有帮助？

```haskell
ghci> :i (++)
(++) :: [a] -> [a] -> [a]
infixr 5 ++
ghci> map (*10) [1..5] ++ [6..10] :: [Int]
[10,20,30,40,50,6,7,8,9,10]
ghci> map (*10) $ [1..5] ++ [6..10] :: [Int]
[10,20,30,40,50,60,70,80,90,100]
```

在这里，我们看到由于追加运算符 `(++)` 的优先级为 5，它*结合得比* `$` *更紧*。因此，它的求值在结果传递给此示例中的 `map` 函数调用之前完成。

**注意** `$` 在 Haskell 代码中无处不在。这就是为什么熟悉它的复杂性 and 用法很重要。然而，使用它当然不是必须的。如果你觉得使用括号更舒服，你应该坚持用括号。

我们将在本书的后续内容中多次遇到这个运算符。如果它看起来令人困惑，只需记住你可以随时用括号重写这些项。

现在，我们可以构造 CSV 值并提供一个安全的外部接口，保证不会产生错误的值！

## 7.3 使用类型类

接下来，我们要构造一些函数来更好地处理 CSV 表，即确定行数和列数的函数。使用记录语法可能会变得有些复杂，因此我们想看看一些语言扩展，它们能让处理记录变得更容易一些。处理记录的默认方式迫使我们写下我们想要访问的字段并给它们一个名字：

```haskell
f Csv {csvHeader=h, csvColumns=c} = ...
```

我们被允许省略不需要的字段：

```haskell
f Csv {csvColumns=c} = ...
```

但是，如果我们不想给一个字段起一个新名字呢？

```haskell
f Csv {csvColumns=csvColumns} = ...
```

如果避免给这个字段起一个多余的名字，会更有意义。使用 `NamedFieldPuns` 语言扩展，我们可以这样做：

```haskell
f Csv {csvColumns} = ...
```

但这仍然需要我们列出所有要使用的字段。当使用一个包含大量字段的记录时，这会变得难以处理。然而，我们可以使用 `RecordWildCards` 语言扩展来使*所有*字段以其名称可用：

```haskell
f Csv {..} = ...
```

现在，我们可以快速访问记录中的字段，而无需将它们都写下来！这让我们能够构造用于计算行数和列数的函数。为此，我们可以假设所有列具有相同数量的元素（因为这是我们类型的不变量）。因此，从列计算行数很简单。确定列数需要我们要么取标题元素的数量，要么（如果是 `Nothing`）取列数。我们可以使用 `maybe` 函数轻松做到这一点。如下面清单所示。

**清单 7.7 计算 CSV 文件中行数和列数的函数**
```haskell
numberOfRows :: Csv -> Int
numberOfRows Csv {..} =      -- #1
  case csvColumns of
    [] -> 0      -- #2
    (x : _) -> length x      -- #3

numberOfColumns :: Csv -> Int
numberOfColumns Csv {..} = length csvColumns      -- #4
```
**#1 从 CSV 记录中提取所有字段，并在函数其余部分使其可用**
**#2 如果没有列，则返回 0**
**#3 返回第一列的长度**
**#4 返回列数**

现在我们已经有了几个构建和描述 CSV 表的函数，我们想要考虑转换它们。我们希望能够组合 CSV 表，切分它们，并计算统计数据。让我们从组合 CSV 表开始吧！

### 7.3.1 Semigroup 和 Monoid

当组合两个 CSV 表时，我们要考虑添加两个完全不同的表，这意味着它们的行数可能不同，并且一个可能有标题而另一个没有。如图 7.1 所示。

[图 7.1：追加两个数据表时的不同场景]

为了纠正这种情况，我们必须用空值填充值。我们可以简单地将标题留为空字符串，并使用 `NullValue` 填充表的数据字段。我们的函数将通过检查其中一个值是否有标题来组合标题。如果没有，新值也不会包含标题。否则，任何缺失的标题都将被一个长度适当的空字符串列表替换。列通过用空单元格（`NullValue`）填充较短的列来追加。此代码如清单 7.8 所示。

**清单 7.8 追加两个 CSV 值的函数**
```haskell
appendCsv :: Csv -> Csv -> Csv      -- #1
appendCsv a b =
  Csv
    { csvHeader =
        if M.isNothing (csvHeader a) && M.isNothing (csvHeader b)
          then Nothing      -- #2
          else Just $ header' a ++ header' b,      -- #3
      csvColumns = appendColumns (csvColumns a) (csvColumns b)
    }
  where
    header' csv =      -- #4
      M.fromMaybe
        (L.replicate (numberOfColumns csv) "")
        (csvHeader csv)

    appendColumns colsA colsB =
      map (\cols -> cols ++ fillA) colsA      -- #5
        ++ map (\cols -> cols ++ fillB) colsB
      where
        fillA = replicate (numberOfRows b - numberOfRows a) NullValue
        fillB = replicate (numberOfRows a - numberOfRows b) NullValue
```
**#1 指定对于要追加的 Csv 值的类型变量，必须存在 HasDefault 类的实例**
**#2 如果要追加的值都没有标题，则将追加后的标题设置为 Nothing**
**#3 组合标题，如果缺失则用空字符串填充**
**#4 计算 Csv 值的标题，如果缺失，则返回与列数相同大小的空字符串列表**
**#5 通过向较短的列追加默认值来追加列**

我们可以立即看到，这个算法只在我们假设所有列大小相同的情况下才有效。否则，我们需要检查最大列大小并将所有列填充到该大小。

**练习：连接 CSV**
`appendCsv` 在表格尺寸不匹配时用空单元格填充。或者，我们可以简单地从较短的 CSV 文件中截断行。自己实现这个替代的追加操作！
观察这些策略如何有点类似于数据库中*外连接*和*内连接*。然而，我们并不是根据某个值或谓词来连接 CSV 文件，而是盲目地追加列。编写执行 `Csv` 类型连接的函数。该函数应该接收一个布尔谓词作为参数，用于决定行是否应该被连接。

我们可以观察到这个函数的另一个属性。当我们想要追加三个 `Csv` 值时，我们可以这样做：`appendCsv a (appendCsv b c)`。然而，顺序不一定重要。我们也可以这样做：`appendCsv (appendCsv a b) c`。这个属性称为*结合性*，是一个基本的数学概念。它允许我们忽略操作的顺序。这个属性如此重要，以至于 Haskell 拥有自己的专门用于具有此类结合性操作的类型类：`Semigroup`。

这个类型类最重要的操作是 `<>`，它是该类型的二元结合操作。按照惯例，它应该是一个结合函数，这意味着 `a <> (b <> c) == (a <> b) <> c` 对于该类型的所有值 `a`、`b` 和 `c` 都成立。然而，编译器不会检查或证明这个属性。你必须自己确保这个属性是正确的。

对于结果的编译，只需按正确顺序添加它们即可，因此任何求值最终结果的项中的 `a <> b` 都不能更改为 `b <> a`。

`Semigroup` 类型类的一个扩展是 `Monoid` 类型类，如下面清单所示。

**清单 7.9 Monoid 的类签名**
```haskell
class Semigroup a => Monoid a where
  mempty :: a      -- #1
  mappend :: a -> a -> a      -- #2
  mconcat :: [a] -> a      -- #3
  {-# MINIMAL mempty #-}
```
**#1 为 mappend 定义单位元**
**#2 为类型定义结合操作**
**#3 定义一个函数，将 mappend 应用于列表中所有的值，将它们合并为一个值**

`mappend` 与 `<>` 是同一个函数，默认情况下其定义为 `mappend = (<>)`。然而，`Monoid` 还有一个常量 `mempty`，它是相对于 `mappend` 的*单位元*，这意味着 `mappend mempty a == a` 和 `mappend a mempty == a` 成立。`mconcat` 看起来与我们之前的 combine 函数非常相似。让我们看看 `Monoid` 的实际应用：

```haskell
ghci> [1,2,3] <> mempty <> [4,5,6] :: [Int]
[1,2,3,4,5,6]
ghci> mconcat [[1,2,3], mempty, [4,5,6]] :: [Int]
[1,2,3,4,5,6]
```

嗯，这看起来不是很熟悉吗？列表具有 `Semigroup` 和 `Monoid` 的实例：

```haskell
instance Semigroup [a] where
  (<>) = (++)

instance Monoid [a] where
  mempty = []
  mconcat xss = [x | xs <- xss, x <- xs]
```

这意味着我们也可以以这种方式使用 `String`！

```haskell
ghci> "Hello" <> " " <> "World" :: String
"Hello World"
ghci> mconcat ["Hello", " ", "World"] :: String
"Hello World"
```

然而，对于某些类型，我们无法定义 `Semigroup` 或 `Monoid`，因为存在*多个*结合函数！`Int` 就是一个很好的例子，我们可以使用加法 *和* 乘法来定义。然而，没有规范的选择。这就是为什么存在 `Sum` 和 `Product` 类型，它们包装一个 `Int` 并为它们的类型类实例选择合适的函数。

**警告** 虽然目前 `mappend` 的实现可能与 `<>` 不同，但这在你的实现中绝不应该发生。将来，`mappend` 可能会从这个类型类中完全移除，并被 `<>` 替换。

既然我们理解了这些类型类，为什么不为我们自己的类型实现它们的实例呢？`Semigroup` 的二元结合函数已经由 `appendCsv` 给出。我们唯一需要的拼图是 `mempty` 值，一个对于 `appendCsv` 来说是单位元的值。哪个 `Csv` 值在追加后不会改变另一个值？当然只有空的 `Csv` 值！所谓*空*，是指没有标题和没有列的 `Csv`。重要的是，我们的 `appendCsv` 有一个类型约束，这个约束也需要被类实例满足。代码如下面清单所示。

**清单 7.10 为 `Csv` 类型实现的 `Semigroup` 和 `Monoid` 实例**
```haskell
instance Semigroup Csv where
  (<>) = appendCsv      -- #1

instance Monoid Csv where
  mempty = Csv {csvHeader = Nothing, csvColumns = []}      -- #2
```
**#1 将结合二元函数定义为 appendCsv**
**#2 定义一个空的 Csv 值**

我们现在也可以使用 `mconcat` 函数来连接一个 `Csv` 值的列表！

**练习：类型类定律**
我们对 `Csv` 实例的定义是正确的，但如何确定呢？为此，我们需要看看 `appendCsv` 函数；具体来说，需要检查数据是如何被追加的。为什么我们的 `mempty` 定义是正确的？尝试确定这些类型类的定律为何成立！

组合多个 CSV 表很好，但是切分它们呢？为此，我们想泛化一种切分数据结构的方法。

### 7.3.2 IsString 类型类

正如我们所见，我们可以使用 `Semigroup` 和 `Monoid` 的方法来组合 `String` 值。事实证明，这同样适用于 `Text` 值：

```haskell
ghci> import Data.Text
ghci> pack "Some text" :: Text
"Some text"
ghci> pack "Hello" <> pack " " <> pack "World" :: Text
"Hello World"
```

为了更轻松地做到这一点，我们来看看另一个类型类，称为 `IsString`。使用这个类，我们可以像写 `String` 值一样写下 `Text` 类型的值：

```haskell
ghci> :set -XOverloadedStrings
ghci> "Some text" :: Text
"Some text"
ghci> "Hello" <> " " <> "World" :: Text
"Hello World"
```

启用这个扩展后，我们可以使用典型的字符串字面量语法来为所有存在 `IsString` 实例的类型写下值。这对于 `String` *和* `Text` 都是成立的！这就是为什么在很多代码库中，你经常看到字符串值通过 `<>` 而不是 `++` 来追加。

但这是如何工作的呢？当启用 `OverloadedStrings` 扩展时，我们可以将值写为字符串，稍后通过 `IsString` 类型类中的 `fromString` 方法将其转换为实际类型：

```haskell
class IsString a where
    fromString :: String -> a
```

因此，我们可以为所有存在 `IsString` 实例的类型写下字符串值。方便的是，`Text` 具有此类的实例。其他类型，如 `ByteString`，也可以与此扩展一起使用。

**注意** 就像 `OverloadedStrings` 和 `IsString` 一样，还存在 `OverloadedLists` 扩展和 `IsList` 类型类，它们使我们能够写下列表并将其转换为其他类型。当定义类似于列表但语法繁琐的数据类型时，这非常有用。

由于这个扩展对任何人都没有伤害，并且在构建使用这些类型的项目时非常有用，我们希望全局启用它。我们可以在项目的 package.yaml 文件中这样做。在那里，我们可以添加一个默认扩展列表，包含所有启用的扩展。顺便一提，我们也可以添加前面提到的 `RecordWildCards` 和 `NamedFieldPuns` 扩展，因为它们也是普遍有用的：

```yaml
default-extensions:
  - OverloadedStrings
  - RecordWildCards
  - NamedFieldPuns
```

这将为我们项目中的每个模块启用这些扩展（不包括外部库）。

**注意** Haskell 支持设置特定的语言“版本”，以启用大量被认为是安全启用的语言扩展。你可以在 [https://mng.bz/2gwm](https://mng.bz/2gwm) 找到它们。

既然我们已经有了使用类型类的经验，我们将注意力转向编写我们自己的类型类！

## 7.4 创建新的类型类

当一个类型类如 `Semigroup` 可用于组合数据时，一个类型类可能在定义数据如何被切分时派上用场。实际上，我们想提取表的部分内容，将它们作为新表来操作。这可以扩展到其他数据结构，例如列表。为此，我们问自己一个问题：我们可以泛化切分数据结构吗？

为了实现这个目标，我们首先在一个新的 src/Data 目录中创建一个名为 `Data.Sliceable` 的新模块。该模块将包含所有用于可切片数据的必要代码。我们想在这个模块中创建一个新的类型类，它定义了分离数据结构部分所需的操作。

在切分数据时，我们想要选择数据结构内的特定范围。我们假设它是有索引的。然后，我们可以简单地通过指定两个索引来定义范围。该值被分成三部分；然而，只有中间部分对我们特别重要。

### 7.4.1 用于切分数据结构的类型类

我们现在可以考虑通过类型类暴露的方法。一个 `slice` 方法，允许我们根据两个索引从数据结构中切出一部分，是必不可少的。然而，由于切分可以自由地给我们感兴趣的切片，我们也应该有一个 `slicePartition` 方法。此外，我们已经可以从 `slicePartition` 方法实现 `slice` 方法！这样的类的实现如下面清单所示。

**清单 7.11 可切片数据的类定义**
```haskell
class Sliceable a where
  slice :: Int -> Int -> a -> a      -- #1
  slice idx1 idx2 xs =      -- #2
    let (_, s, _) = slicePartition idx1 idx2 xs
     in s
  slicePartition :: Int -> Int -> a -> (a, a, a)      -- #3
```
**#1 声明一个 slice 方法，返回数据的某个部分切片**
**#2 为 slice 方法提供默认实现**
**#3 声明一个 slicePartition 方法，将数据分成三部分**

由于这个类引入了一个通用概念，我们可以把它放在一个叫做 `Data.Sliceable` 的模块中。`Sliceable` 是我们类的名称，`a` 是我们现在正在为其定义类型表达式的类型变量。这个类型变量在类内是词法作用域的，因此如果某个类型包含变量 `a`，它指的是稍后将为该类创建实例的具体类型 `a`。该类然后定义了两个方法，称为 `slice` 和 `slicePartition`。

在这段代码中，我们还可以看到如何为方法添加默认行为。在一个类中，声明的方法对于其他定义是已知的。我们为 `slice` 实现的实现是默认实现，当在实例中没有显式定义时，它会被自动推断。

**注意** 方法的默认实现可以被覆盖。当我们能为特定类型找到更高性能的实现时，这很有帮助。

当加载新模块并使用 GHCi 获取有关我们类型类的信息时，我们看到以下内容：

```haskell
ghci> import Data.Sliceable
ghci> :i Sliceable
type Sliceable :: * -> Constraint
class Sliceable a where
  slice :: Int -> Int -> a -> a
  slicePartition :: Int -> Int -> a -> (a, a, a)
  {-# MINIMAL slicePartition #-}
```

就像许多其他类一样，我们看到一个仅包含 `slicePartition` 方法的最小定义，因为 `slice` 可以从它推断出来！我们现在可以为列表构建一个实例，使用 `take` 和 `drop` 函数，它们要么从列表中取出一定数量的元素并返回，要么从列表中删除一定数量的元素并返回剩余部分。列表中从某个索引到另一个索引的*切片*是一个列表，它包含从原始列表的第一个索引开始到第二个索引结束的元素，但不包括该索引处的元素。这给我们留下了一个长度等于两个索引之差的列表。代码如下面清单所示。

**清单 7.12 `Sliceable` 类型类的一个实例**
```haskell
instance Sliceable [a] where
  slicePartition idx1 idx2 xs =      -- #1
    ( take idx1 xs,      -- #2
      take (idx2 - idx1) $ drop idx1 xs,      -- #3
      drop idx2 xs      -- #4
    )
```
**#1 定义 slicePartition 函数，将列表分成三部分**
**#2 定义列表的第一部分为切片之前的元素**
**#3 定义切片本身**
**#4 定义列表的第一部分为切片之后的元素**

这个定义现在自动产生了 slice 函数！

```haskell
ghci> import Data.Sliceable
ghci> slicePartition 2 8 [0..9] :: ([Int], [Int], [Int])
([0,1],[2,3,4,5,6,7],[8,9])
ghci> slice 2 8 [0..9] :: [Int]
[2,3,4,5,6,7]
```

此外，我们可以为这个类找到另一个实例，用于 `Maybe`。如果 `Maybe` 内的类型是可切片的，那么我们就可以切片这个类型的 `Maybe`。要么分区的片段被放在一个 `Just` 中，要么每个分区都是一个 `Nothing`。实例在以下清单中定义。

**清单 7.13 `Sliceable` 类型类的一个实例**
```haskell
instance Sliceable a => Sliceable (Maybe a) where      -- #1
  slicePartition idx1 idx2 Nothing =
    (Nothing, Nothing, Nothing)      -- #2
  slicePartition idx1 idx2 (Just xs) =
    let (hd, s, tl) = slicePartition idx1 idx2 xs      -- #3
     in (Just hd, Just s, Just tl)      -- #4
```
**#1 为每个 Maybe 定义实例，前提是其类型参数也有一个 Sliceable 实例**
**#2 如果输入是 Nothing，则每个分区都返回 Nothing**
**#3 对 Just 值调用 slicePartition**
**#4 将 slicePartition 的结果包装在 Just 构造函数中**

就像函数一样，类型类可以有类型约束。我们在清单 7.13 的代码中使用它来指定 `Maybe` 内部包装的值必须是可切片的，以便为具体的 `Maybe` 类型提供实现。因此，我们可以在类实例的定义中使用 `Sliceable a` 实例给我们的 `slicePartition`。

现在，我们可以在任何 `Maybe a` 上使用 `slice`，只要 `a` 有 `Sliceable` 的实例：

```haskell
ghci> slicePartition 2 8 $ (Just [0..9] :: Maybe [Int])
(Just [0,1],Just [2,3,4,5,6,7],Just [8,9])
ghci> slice 2 8 $ (Just [0..9] :: Maybe [Int])
Just [2,3,4,5,6,7]
ghci> slice 2 8 $ (Nothing :: Maybe [Int])
Nothing
```

这两个实例对我们的 `Csv` 类型都很重要，因为它本质上由一个 `Maybe` 的列表和一个列表的列表组成。在切分 CSV 表时，我们按列切分表，并从这些切片中创建新值。如图 7.2 所示。

[图 7.2：切分 CSV 表]

可以通过分别切分标题和列来切分一个 `Csv`。我们已经创建的实例可以用于此目的！代码如下面清单所示。

**清单 7.14 `Sliceable` 类型类的一个实例**
```haskell
instance Sliceable Csv where
  slicePartition idx1 idx2 Csv {..} =
    let (headerHd, headerSpl, headerTl) =
          slicePartition idx1 idx2 csvHeader      -- #1
        (columHd, columnSpl, columnTl) =
          slicePartition idx1 idx2 csvColumns      -- #2
     in ( Csv {csvHeader = headerHd, csvHeader = columHd},         -- #3
          Csv {csvHeader = headerSpl, csvHeader = columnSpl},  -- #3
          Csv {csvHeader = headerTl, csvHeader = columnTl}     -- #3
            )
```
**#1 使用 Maybe 的实现切分标题**
**#2 使用列表的实现切分列**
**#3 将分区包装到 Csv 构造函数中**

使用这个，我们可以切分任意的 `Csv` 值！

**练习：映射切片**
`slicePartition` 可以用来编写更多的函数，因为它将值分解成可以独立使用的更小部分。一个函数可以是 `sliceMap`，它将一个函数映射到切片上，但不映射到其他部分，然后再次将这些部分追加起来。完全多态地编写那个函数。你需要在类型约束中使用第二个类型类。
同样地，编写一个 `sliceDelete` 函数，该函数从某个值中删除一个切片。这也需要你考虑类型类。

### 7.4.2 重新导出模块

现在我们已经为应用程序实现了一些功能，我们应该开始考虑项目结构以及将哪些定义导入到其他模块中。

在 Haskell 中，将模块导入到其他模块是一种很好的代码共享方式，但它也带来了问题。名称冲突，以及（更糟糕的）循环导入，可能使项目难以编译。为了避免这些陷阱，将一个概念相关的模块打包在一起以便于方便地重新导出，是一个好主意，这可以通过在单个文件中完成。在我们的项目中，我们将 CSV 功能打包到名为 Csv 的子目录中，该目录将包含用于处理 `Csv` 类型的模块。在此目录中，我们首先可以定义一个 `Types` 模块，该模块将导出所有必要的类型；`Csv` 就是其中之一。接下来是 `Conversion` 模块，用于定义我们工具所需的转换和数据转换。我们的目录结构将如下所示：

```
src
├── Csv
│   ├── Conversion.hs
│   └── Types.hs
└── Data
    └── Sliceable.hs
```

现在，我们想在最顶层添加一个 `Csv` 模块，以公开 Csv 子目录中的模块。我们可以使用模块的导出列表来做到这一点，通过 `module` 关键字引用模块，如下面清单所示。

**清单 7.15 模块重新导出**
```haskell
module Csv
  ( module Csv.Conversion,      -- #1
    module Csv.Types,
  )
where

import Csv.Conversion         -- #2
import Csv.Types
```
**#1 从 Csv 模块重新导出导入的模块**
**#2 将模块导入到 Csv 模块**

这将使我们能够只导入一个模块并获得我们需要的所有定义，而无需担心循环导入。这个模块也可以是那些需要来自多个模块的定义的代码的所在地。

现在是时候测试我们的函数了。在此之前，我们需要将 CSV 表导入到我们的程序中。出于这个原因，我们想在下章探索解析 CSV 文件。

## 总结
+   记录可用于为复杂数据建模，并自动生成访问函数。
+   `Either` 类型可用于编码程序中的错误，使我们能够生成错误值，如错误消息。
+   智能构造器是用于构建值并检查这些值的属性的函数。
+   可以启用 `RecordWildCards` 和 `NamedFieldPuns` 以简化记录的使用。
+   `Semigroup` 和 `Monoid` 是规定类型上结合函数的类型类。
+   通过使用类型类，我们可以将行为泛化到各种类型，并创建更通用的代码。
+   模块重新导出可用于将多个模块导出捆绑到一个模块中。