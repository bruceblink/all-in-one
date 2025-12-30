---
sidebar_position: 10
typora-root-url: ./..\..\static
---

# 第 10 章 - 规划 (Planning)

在查询处理的第一步中，**解析器 (parser)** 从 SQL 语句中提取相关数据。下一步是将这些数据转换为关系代数查询树。这一步称为**规划 (planning)**。本章探讨基本的规划过程。它探讨了规划器需要做什么来验证 SQL 语句是否具有语义意义，并介绍了两种基本**计划构建算法 (plan-construction algorithms)**。

一个 SQL 语句可以有许多等效的查询树，它们的成本往往差异巨大。一个希望在商业上可行的数据库系统必须有一个能够找到高效计划的规划算法。第 15 章将探讨创建最优计划的困难主题。

## 10.1 验证 (Verification)

**规划器 (planner)** 的首要职责是确定给定的 SQL 语句是否实际有意义。规划器需要验证语句的以下几点：

- 所提及的表和字段确实存在于**目录 (catalog)** 中。
- 所提及的字段没有歧义。
- 字段上的操作是**类型正确 (type-correct)** 的。
- 所有常量对于其字段来说都具有正确的**大小 (size)** 和**类型 (type)**。

执行此验证所需的所有信息都可以通过检查所提及表的**模式 (schemas)** 来找到。例如，模式的缺失表明所提及的表不存在。类似地，任何模式中字段的缺失表明该字段不存在，而它出现在多个模式中则表明可能存在歧义。

规划器还应该通过检查每个提及字段的类型和长度来确定**谓词 (predicates)**、**修改赋值 (modification assignments)** 和**插入值 (inserted values)** 的类型正确性。对于谓词，表达式中每个操作符的参数必须是兼容类型，每个项中的表达式也必须是兼容类型。修改语句将一个表达式赋值给一个字段；这两种类型必须兼容。对于插入语句，每个插入值的类型必须与其关联字段的类型兼容。

SimpleDB 规划器可以通过元数据管理器的 `getLayout` 方法获取必要的表模式。然而，规划器目前不执行任何显式验证。练习 10.4-10.8 要求您纠正这种情况。

## 10.2 评估查询树的成本 (The Cost of Evaluating a Query Tree)

规划器的第二个职责是为查询构建一个**关系代数查询树 (relational algebra query tree)**。一个复杂之处在于，一个 SQL 查询可以通过几种不同的查询树来实现，每个查询树都有自己的执行时间。规划器负责选择最有效的一个。

但是规划器如何计算查询树的效率呢？回想一下，查询运行时间最重要的贡献者是它访问的块数。因此，查询树的成本定义为**完全迭代查询的扫描所需的块访问次数**。

扫描的成本可以通过递归计算其子扫描的成本，然后应用基于扫描类型的成本公式来计算。图 10.1 给出了三个成本函数的公式。每个关系操作符都有自己的这些函数公式。成本函数是：

**图 10.1 扫描的成本公式 (The cost formulas for scans)**

![image-20250613101553638](/img/database-design-and-implementation-second-edition/chapter10/fig10-1.png)

- B(s) = 构建扫描 s 的输出所需的块访问次数。
- R(s) = 扫描 s 输出中的记录数。
- V(s,F) = 扫描 s 输出中不同 F 值的数量。

这些函数类似于统计管理器的 `blocksAccessed`、`recordsOutput` 和 `distinctValues` 方法。不同之处在于它们适用于扫描而不是表。

快速检查图 10.1 显示了三个成本函数之间的相互关系。给定一个扫描 s，规划器希望计算 B(s)。但如果 s 是两个表的乘积，那么 B(s) 的值取决于两个表的块数以及其左侧扫描中的记录数。如果左侧扫描涉及一个选择操作符，那么它的记录数取决于谓词中提及字段的不同值的数量。换句话说，规划器需要所有这三个函数。

以下小节将推导图 10.1 所示的成本函数，并举例说明如何使用它们来计算查询树的成本。

### 10.2.1 表扫描的成本 (The Cost of a Table Scan)

查询中的每个**表扫描 (table scan)** 都持有其当前的记录页，该记录页持有一个缓冲区，该缓冲区锁定一个页面。当该页面中的记录已被读取时，其缓冲区被解除锁定，并且文件中下一个块的记录页取代它的位置。因此，一次通过表扫描将精确地访问每个块一次，每次锁定一个缓冲区。因此，当 s 是一个表扫描时，B(s)、R(s) 和 V(s,F) 的值就是底层表中**块数 (number of blocks)**、**记录数 (number of records)** 和**不同值的数量 (number of distinct values)**。

### 10.2.2 选择扫描的成本 (The Cost of a Select Scan)

选择扫描 (select scan) s 有一个底层扫描；称之为 s1。每次调用 next 方法都会导致选择扫描对 s1.next 进行一次或多次调用；当对 s1.next 的调用返回 false 时，该方法将返回 false。每次调用 getInt、getString 或 getVal 都只是从 s1 请求字段值，不需要块访问。因此，遍历一个选择扫描所需的块访问次数与其底层扫描所需的块访问次数完全相同。也就是说：

`B(s)=B(s1)`

R(s) 和 V(s,F) 的计算取决于选择谓词。作为示例，我将分析选择谓词将字段与常量或另一个字段等同的常见情况。

#### 常量选择 (Selection on a Constant)

假设谓词的形式为 A=c（其中 A 是某个字段）。假设 A 中的值是均匀分布 (equally distributed) 的，则将有 `R(s1)/V(s1,A)` 条记录匹配该谓词。也就是说：

`R(s)=R(s1)/V(s1,A)`

均匀分布的假设也意味着其他字段的值在输出中仍然是均匀分布的。也就是说：

`V(s,A)=1`

`V(s,F)=V(s1,F)` 对于所有其他字段 F

#### 字段选择 (Selection on a Field)

现在假设谓词的形式为 A=B（其中 A 和 B 是字段）。在这种情况下，合理地假设字段 A 和 B 中的值以某种方式相关。特别是，假设如果 B 值多于 A 值（即 `V(s1,A)<V(s1,B)`），则每个 A 值都出现在 B 中的某个位置；如果 A 值多于 B 值，则情况相反。（这个假设在 A 和 B 具有键-外键关系 (key-foreign key relationship) 的典型情况下是确实如此的。）所以假设 B 值多于 A 值，并考虑 s1 中的任何一条记录。它的 A 值有 `1/V(s1,B)` 的机会与其 B 值匹配。类似地，如果 A 值多于 B 值，则它的 B 值有 `1/V(s1,A)` 的机会与其 A 值匹配。因此：

`R(s)=R(s1)/max{V(s1,A),V(s1,B)}`

均匀分布的假设也意味着每个 A 值与 B 值匹配的可能性均等。因此，我们有：

`V(s,F)=min{V(s1,A),V(s1,B)}` 对于 F=A 或 B

`V(s,F)=V(s1,F)` 对于所有除了 A 或 B 之外的字段 F

### 10.2.3 投影扫描的成本 (The Cost of a Project Scan)

与选择扫描一样，投影扫描 (project scan) 只有一个底层扫描（称为 s1），并且除了其底层扫描所需的块访问之外，不需要额外的块访问。此外，投影操作不改变记录数，也不改变任何记录的值。因此：

`B(s)=B(s1)`

`R(s)=R(s1)`

`V(s,F)=V(s1,F)` 对于所有字段 F

### 10.2.4 乘积扫描的成本 (The Cost of a Product Scan)

**乘积扫描 (product scan)** 有两个底层扫描，s1 和 s2。它的输出包含 s1 和 s2 中记录的所有组合。当遍历扫描时，底层扫描 s1 将被遍历一次，而底层扫描 s2 将为 s1 的每条记录遍历一次。以下公式随之而来：

`B(s)=B(s1)+R(s1)⋅B(s2)`

`R(s)=R(s1)⋅R(s2)`

`V(s,F)=V(s1,F) 或 V(s2,F)`，取决于 F 属于哪个模式。

意识到 B(s) 的公式对于 s1 和 s2 是不对称的 (not symmetric) 是非常有趣和重要的。也就是说，语句

`Scan s3 = new ProductScan(s1, s2);`

可能导致与逻辑等价的语句

`Scan s3 = new ProductScan(s2, s1);`

不同数量的块访问。

它们能有多大不同？定义

`RPB(s)=R(s)/B(s)`

也就是说，RPB(s) 表示扫描 s 的“每块记录数”——每次块访问产生的平均输出记录数。上述公式可以重写如下：

`B(s)=B(s1)+(RPB(s1)⋅B(s1)⋅B(s2))`

主导项是 `B(s)=B(s1)+R(s1)⋅B(s2)`。如果你将此项与交换 s1 和 s2 后获得的项进行比较，你会发现当 s1 是 RPB 最低的底层扫描时，乘积扫描的成本通常是最低的。

例如，假设 s1 是 `STUDENT` 的表扫描，s2 是 `DEPT` 的表扫描。由于 `STUDENT` 记录比 `DEPT` 记录大，更多 `DEPT` 记录可以放入一个块中，这意味着 `STUDENT` 的 RPB 比 `DEPT` 小。上述分析表明，当 `STUDENT` 的扫描先进行时，磁盘访问次数最少。

### 10.2.5 一个具体示例 (A Concrete Example)

考虑一个查询，它返回主修数学的学生的姓名。图 10.2a 描绘了该查询的**查询树 (query tree)**，图 10.2b 给出了相应扫描的 SimpleDB 代码。

**图 10.2 查找主修数学的学生姓名。(a) 查询树，(b) 相应的 SimpleDB 扫描**

![image-20250613102005933](/img/database-design-and-implementation-second-edition/chapter10/fig10-2a.png)

```java
// (b) 相应的 SimpleDB 扫描代码片段
SimpleDB db = new SimpleDB("studentdb");
Transaction tx = db.newTx();
MetadataMgr mdm = db.mdMgr();

// 获取 STUDENT 表的布局信息
Layout slayout = mdm.getLayout("student", tx);
// 获取 DEPT 表的布局信息
Layout dlayout = mdm.getLayout("dept", tx);

// s1: 对 STUDENT 表的表扫描
Scan s1 = new TableScan(tx, "student", slayout);

// s2: 对 DEPT 表的表扫描
Scan s2 = new TableScan(tx, "dept", dlayout);

// pred1: 谓词，例如 DName='math'
Predicate pred1 = new Predicate(. . .); // 例如：new Term(new Expression("dname"), new Expression(new Constant("math")))

// s3: 对 s2 (DEPT 表) 的选择扫描，过滤 DName='math'
Scan s3 = new SelectScan(s2, pred1);

// s4: s1 (STUDENT) 和 s3 (选择后的 DEPT) 的乘积扫描
Scan s4 = new ProductScan(s1, s3);

// pred2: 谓词，例如 majorid=did
Predicate pred2 = new Predicate(. . .); // 例如：new Term(new Expression("majorid"), new Expression("did"))

// s5: 对 s4 (乘积结果) 的选择扫描，过滤 majorid=did
Scan s5 = new SelectScan(s4, pred2);

// fields: 要投影的字段列表，例如 "sname"
List<String> fields = Arrays.asList("sname");

// s6: 对 s5 (选择后的乘积结果) 的投影扫描
Scan s6 = new ProjectScan(s5, fields);
```

图 10.3 使用图 7.8 中的**统计元数据 (statistical metadata)** 计算了图 10.2b 中每个扫描的成本。s1 和 s2 的条目只是简单地复制了图 7.8 中 `STUDENT` 和 `DEPT` 的统计数据。s3 的条目表示对 `DName` 的选择返回 1 条记录，但需要搜索 `DEPT` 的两个块才能找到它。扫描 s4 返回 45,000 条 `STUDENT` 记录与 1 条选定记录的所有组合；输出为 45,000 条记录。然而，该操作需要 94,500 次块访问，因为必须找到唯一的数学系记录 45,000 次，并且每次都需要对 `DEPT` 进行 2 个块的扫描。（另外 4500 次块访问来自对 `STUDENT` 的单次扫描。）扫描 s5 中对 `MajorId` 的选择将输出减少到 1125 条记录（45,000 名学生 / 40 个系），但不会改变所需的块访问次数。当然，投影操作什么也不会改变。

**图 10.3 查询树的成本 (Cost of the Query Tree)**

![image-20250613101846110](/img/database-design-and-implementation-second-edition/chapter10/fig10-3.png)

数据库系统会重新计算数学系记录 45,000 次，并且代价高昂，这可能看起来很奇怪；然而，这就是**管道式查询处理 (pipelined query processing)** 的本质。（事实上，在这种情况下，第 13 章的非管道式实现会很有用。）

查看 STUDENT 和 s3 的 RPB 值，你会发现 `RPB(STUDENT) = 10`，而 `RPB(s3) = 0.5`。由于当 RPB 较小的扫描位于左侧时，乘积操作最快，因此更有效的策略是将 s4 定义如下：

`s4 = new ProductScan(s3, STUDENT)`

练习 10.3 要求你证明在这种情况下，操作仅需要 4502 次块访问。这种差异主要归因于现在只计算了一次选择操作。

## 10.3 计划 (Plans)

SimpleDB 中计算查询树成本的对象被称为**计划 (plan)**。计划实现了 `Plan` 接口，其代码如 图 10.4 所示。

该接口支持 `blocksAccessed`、`recordsOutput` 和 `distinctValues` 方法，这些方法用于计算查询的 B(s)、R(s) 和 V(s,F) 值。`schema` 方法返回输出表的模式。查询规划器可以使用此模式来验证类型正确性并寻找优化计划的方法。最后，每个计划都有 `open` 方法，它创建其对应的扫描。

计划和扫描在概念上是相似的，因为它们都表示一个查询树。区别在于，**计划访问查询中表的元数据，而扫描访问它们的数据**。当你提交一个 SQL 查询时，数据库规划器可能会为该查询创建多个计划，并使用它们的元数据来选择最有效的一个。然后，它使用该计划的 `open` 方法来创建所需的扫描。

计划的构建方式与扫描类似。每个关系代数操作符都有一个 `Plan` 类，外加用于处理存储表的 `TablePlan` 类。例如，图 10.5 的代码检索了主修数学的学生的姓名，与图 10.2 中的查询相同。唯一的区别是图 10.5 使用计划构建查询树，并将最终计划转换为扫描。

**图 10.4 SimpleDB `Plan` 接口 (The SimpleDB Plan interface)**

```java
import simpledb.record.Schema; // 假设 Schema 类在 simpledb.record 包中
import simpledb.query.Scan;   // 假设 Scan 接口在 simpledb.query 包中

public interface Plan {
    // 创建并返回与此计划对应的 Scan 对象
    public Scan open();

    // 返回执行此计划所需的块访问次数 (B(s))
    public int blocksAccessed();

    // 返回此计划输出的记录数 (R(s))
    public int recordsOutput();

    // 返回此计划输出中指定字段的不同值的数量 (V(s, F))
    public int distinctValues(String fldname);

    // 返回此计划输出的表的模式
    public Schema schema();
}
```

**图 10.5 使用计划创建查询 (Using plans to create a query)**

```java
import simpledb.server.SimpleDB; // 假设 SimpleDB 类在 simpledb.server 包中
import simpledb.tx.Transaction; // 假设 Transaction 类在 simpledb.tx 包中
import simpledb.metadata.MetadataMgr; // 假设 MetadataMgr 类在 simpledb.metadata 包中
import simpledb.plan.*; // 假设 Plan 相关的类 (TablePlan, SelectPlan, ProductPlan, ProjectPlan) 在 simpledb.plan 包中
import simpledb.query.Predicate; // 假设 Predicate 类在 simpledb.query 包中
import simpledb.query.Scan; // 假设 Scan 接口在 simpledb.query 包中
import java.util.Arrays;
import java.util.List;

// 初始化 SimpleDB 数据库实例
SimpleDB db = new SimpleDB("studentdb");
// 获取元数据管理器
MetadataMgr mdm = db.mdMgr();
// 开启一个新事务
Transaction tx = db.newTx();

// p1: 创建 STUDENT 表的计划
Plan p1 = new TablePlan(tx, "student", mdm);

// p2: 创建 DEPT 表的计划
Plan p2 = new TablePlan(tx, "dept", mdm);

// pred1: 谓词，例如 DName='math' (具体实现需要根据 Predicate 类的构造函数)
Predicate pred1 = new Predicate(/* ... */); // 例如：new Term(new Expression("dname"), new Expression(new Constant("math")))

// p3: 对 p2 (DEPT 表) 的选择计划，过滤 DName='math'
Plan p3 = new SelectPlan(p2, pred1);

// p4: p1 (STUDENT) 和 p3 (选择后的 DEPT) 的乘积计划
Plan p4 = new ProductPlan(p1, p3);

// pred2: 谓词，例如 majorid=did (具体实现需要根据 Predicate 类的构造函数)
Predicate pred2 = new Predicate(/* ... */); // 例如：new Term(new Expression("majorid"), new Expression("did"))

// p5: 对 p4 (乘积结果) 的选择计划，过滤 majorid=did
Plan p5 = new SelectPlan(p4, pred2);

// fields: 要投影的字段列表，例如 "sname"
List<String> fields = Arrays.asList("sname");

// p6: 对 p5 (选择后的乘积结果) 的投影计划
Plan p6 = new ProjectPlan(p5, fields);

// 使用最终计划 p6 创建对应的 Scan 对象
Scan s = p6.open();
```

图 10.6、10.7、10.8、10.9 和 10.10 给出了 `TablePlan`、`SelectPlan`、`ProjectPlan` 和 `ProductPlan` 类的代码。`TablePlan` 类直接从元数据管理器获取其成本估算。其他类使用上一节的公式计算它们的估算值。

选择计划的成本估算比其他操作符更复杂，因为估算值取决于谓词。因此，谓词具有 `reductionFactor` 和 `equatesWithConstant` 方法供选择计划使用。`reductionFactor` 方法被 `recordsAccessed` 使用，以计算谓词减少输入表大小的程度。`equatesWithConstant` 方法被 `distinctValues` 使用，以确定谓词是否将指定字段与常量等同。

`ProjectPlan` 和 `ProductPlan` 的构造函数从其底层计划的模式创建它们的模式。`ProjectPlan` 模式是通过查找底层字段列表的每个字段并将该信息添加到新模式中来创建的。`ProductPlan` 模式是底层模式的并集。

这些计划类中每个 `open` 方法都很直接。通常，从计划构建扫描有两个步骤：首先，该方法递归地为每个底层计划构建一个扫描。其次，它将这些扫描传递给操作符的 `Scan` 构造函数。

**图 10.6 SimpleDB `TablePlan` 类的代码 (The code for the SimpleDB class TablePlan)**

```java
import simpledb.query.Scan;
import simpledb.query.TableScan; // 假设 TableScan 类在 simpledb.query 包中
import simpledb.record.Layout;   // 假设 Layout 类在 simpledb.record 包中
import simpledb.record.Schema;   // 假设 Schema 类在 simpledb.record 包中
import simpledb.tx.Transaction; // 假设 Transaction 类在 simpledb.tx 包中
import simpledb.metadata.MetadataMgr; // 假设 MetadataMgr 类在 simpledb.metadata 包中
import simpledb.stats.StatInfo; // 假设 StatInfo 类在 simpledb.stats 包中

public class TablePlan implements Plan {
    private Transaction tx;
    private String tblname;
    private Layout layout; // 表的布局
    private StatInfo si;   // 表的统计信息

    // 构造函数
    public TablePlan(Transaction tx, String tblname, MetadataMgr md) {
        this.tx = tx;
        this.tblname = tblname;
        // 从元数据管理器获取表的布局
        layout = md.getLayout(tblname, tx);
        // 从元数据管理器获取表的统计信息
        si = md.getStatInfo(tblname, layout, tx);
    }

    // 创建并返回一个 TableScan 对象
    public Scan open() {
        return new TableScan(tx, tblname, layout);
    }

    // 返回表访问的块数 (从统计信息获取)
    public int blocksAccessed() {
        return si.blocksAccessed();
    }

    // 返回表中的记录数 (从统计信息获取)
    public int recordsOutput() {
        return si.recordsOutput();
    }

    // 返回指定字段的不同值数量 (从统计信息获取)
    public int distinctValues(String fldname) {
        return si.distinctValues(fldname);
    }

    // 返回表的模式 (从布局获取)
    public Schema schema() {
        return layout.schema();
    }
}
```

**图 10.7 SimpleDB `SelectPlan` 类的代码 (The code for the SimpleDB class SelectPlan)**

```java
import simpledb.query.Predicate; // 假设 Predicate 类在 simpledb.query 包中
import simpledb.query.Scan;     // 假设 Scan 接口在 simpledb.query 包中
import simpledb.query.SelectScan; // 假设 SelectScan 类在 simpledb.query 包中
import simpledb.record.Schema; // 假设 Schema 类在 simpledb.record 包中

public class SelectPlan implements Plan {
    private Plan p;         // 底层计划
    private Predicate pred; // 选择谓词

    // 构造函数
    public SelectPlan(Plan p, Predicate pred) {
        this.p = p;
        this.pred = pred;
    }

    // 创建并返回一个 SelectScan 对象，底层扫描通过 p.open() 获取
    public Scan open() {
        Scan s = p.open();
        return new SelectScan(s, pred);
    }

    // 返回块访问数 (与底层计划相同)
    public int blocksAccessed() {
        return p.blocksAccessed();
    }

    // 返回记录数 (底层计划记录数 / 谓词的归约因子)
    public int recordsOutput() {
        return p.recordsOutput() / pred.reductionFactor(p);
    }

    // 返回指定字段的不同值数量
    public int distinctValues(String fldname) {
        // 如果谓词将字段与常量等同，则不同值为 1
        if (pred.equatesWithConstant(fldname) != null) {
            return 1;
        } else {
            // 如果谓词将字段与另一个字段等同
            String fldname2 = pred.equatesWithField(fldname);
            if (fldname2 != null) {
                // 不同值为两个字段不同值数量的最小值
                return Math.min(p.distinctValues(fldname), p.distinctValues(fldname2));
            } else {
                // 否则，不同值数量与底层计划相同
                return p.distinctValues(fldname);
            }
        }
    }

    // 返回模式 (与底层计划相同)
    public Schema schema() {
        return p.schema();
    }
}
```

**图 10.8 SimpleDB `ProjectPlan` 类的代码 (The code for the SimpleDB class ProjectPlan)**

```java
import simpledb.query.ProjectScan; // 假设 ProjectScan 类在 simpledb.query 包中
import simpledb.query.Scan;      // 假设 Scan 接口在 simpledb.query 包中
import simpledb.record.Schema;   // 假设 Schema 类在 simpledb.record 包中
import java.util.List;

public class ProjectPlan implements Plan {
    private Plan p;      // 底层计划
    private Schema schema = new Schema(); // 投影后的模式

    // 构造函数
    public ProjectPlan(Plan p, List<String> fieldlist) {
        this.p = p;
        // 根据字段列表和底层计划的模式构建新的模式
        for (String fldname : fieldlist) {
            schema.add(fldname, p.schema());
        }
    }

    // 创建并返回一个 ProjectScan 对象
    public Scan open() {
        Scan s = p.open();
        return new ProjectScan(s, schema.fields()); // ProjectScan 需要的是字段名列表
    }

    // 返回块访问数 (与底层计划相同)
    public int blocksAccessed() {
        return p.blocksAccessed();
    }

    // 返回记录数 (与底层计划相同)
    public int recordsOutput() {
        return p.recordsOutput();
    }

    // 返回指定字段的不同值数量 (与底层计划相同)
    public int distinctValues(String fldname) {
        return p.distinctValues(fldname);
    }

    // 返回投影后的模式
    public Schema schema() {
        return schema;
    }
}
```

## 10.4 查询计划 (Query Planning)

我们回顾一下，**解析器**将 SQL 查询字符串作为输入，并返回一个 **`QueryData`** 对象作为输出。本节将探讨如何从这个 `QueryData` 对象构建一个**计划**。

### 10.4.1 SimpleDB 查询规划算法 (The SimpleDB Query Planning Algorithm)

SimpleDB 支持一个简化的 SQL 子集，它不包含计算、排序、分组、嵌套和重命名等复杂操作。因此，其所有 SQL 查询都可以通过仅使用**选择 (select)**、**投影 (project)** 和**乘积 (product)** 这三个操作符的查询树来实现。创建此类计划的算法如 图 10.10 所示。

**图 10.9 SimpleDB `ProductPlan` 类的代码 (The code for the SimpleDB class ProductPlan)**

```java
import simpledb.query.ProductScan;
import simpledb.query.Scan;
import simpledb.record.Schema;

public class ProductPlan implements Plan {
    private Plan p1, p2; // 两个底层计划
    private Schema schema = new Schema(); // 乘积后的模式

    // 构造函数：初始化两个底层计划，并合并它们的模式
    public ProductPlan(Plan p1, Plan p2) {
        this.p1 = p1;
        this.p2 = p2;
        schema.addAll(p1.schema());
        schema.addAll(p2.schema());
    }

    // open 方法：打开底层计划的扫描，然后返回一个 ProductScan
    public Scan open() {
        Scan s1 = p1.open();
        Scan s2 = p2.open();
        return new ProductScan(s1, s2);
    }

    // blocksAccessed 方法：计算乘积操作的块访问成本
    public int blocksAccessed() {
        return p1.blocksAccessed()
                + (p1.recordsOutput() * p2.blocksAccessed());
    }

    // recordsOutput 方法：计算乘积操作的记录输出数
    public int recordsOutput() {
        return p1.recordsOutput() * p2.recordsOutput();
    }

    // distinctValues 方法：返回指定字段的不同值数量（取决于字段属于哪个底层计划）
    public int distinctValues(String fldname) {
        if (p1.schema().hasField(fldname))
            return p1.distinctValues(fldname);
        else
            return p2.distinctValues(fldname);
    }

    // schema 方法：返回乘积操作的模式
    public Schema schema() {
        return schema;
    }
}
```

**图 10.10 SimpleDB SQL 子集的基本查询规划算法 (The basic query planning algorithm for the SimpleDB subset of SQL)**

1. **为 `from` 子句中的每个表 `T` 构建一个计划。** a) 如果 `T` 是一个存储表，那么该计划就是 `T` 的一个表计划。 b) 如果 `T` 是一个视图，那么该计划是**递归调用此算法**来处理 `T` 定义的结果。
2. **按照给定顺序，对这些表计划进行乘积操作。**
3. **根据 `where` 子句中的谓词进行选择操作。**
4. **根据 `select` 子句中的字段进行投影操作。**

作为此查询规划算法的一个示例，考虑图 10.11。图 (a) 给出了一个 SQL 查询，它检索获得“A”成绩的爱因斯坦教授的学生姓名。图 (b) 是该算法生成的查询树。

**图 10.11 将基本查询规划算法应用于 SQL 查询 (Example of the Query Planning Algorithm)**

![fig10-11](/img/database-design-and-implementation-second-edition/chapter10/fig10-11.png)

**(a) SQL 查询 (SQL Query):**

```sql
SELECT SName
FROM STUDENT, ENROLL, COURSE, SECTION
WHERE SId = StudId AND SectId = SectionId AND CourseId = CId AND Prof = 'Einstein' AND Grade = 'A'
```

图 10.12 说明了使用视图的等效查询的查询规划算法。图 (a) 给出了视图定义和查询，图 (b) 描绘了视图的查询树，图 (c) 描绘了整个查询的查询树。

 **图 10.12 在存在视图的情况下应用基本查询规划算法 .(a) SQL 查询，(b) 视图的树，(c) 整个查询的树**

**(a) 视图定义和查询 (View Definition and Query):**

```sql
-- 视图定义
CREATE VIEW MathStudents AS
SELECT SName, MajorId, GradYear FROM STUDENT WHERE MajorId = 30;

-- 使用视图的查询
SELECT SName FROM MathStudents WHERE GradYear < 2025;
```

![fig10-12](/img/database-design-and-implementation-second-edition/chapter10/fig10-12.png)

要了解这种查询规划算法的示例，请考虑图 10.11。**图 (a)** 给出了一个 SQL 查询，它检索获得爱因斯坦教授“A”成绩的学生的姓名。**图 (b)** 是该算法生成的查询树。

图 10.12 说明了使用视图的等效查询的查询规划算法。**图 (a)** 给出了视图定义和查询，**图 (b)** 描绘了视图的查询树，**图 (c)** 描绘了整个查询的树。

请注意，最终的树由两个表的乘积和视图树组成，然后是选择和投影。这个最终的树与图 10.11b 的树是等效的，但又有些不同。特别是，原始选择谓词的一部分已被“下推”到树的下方，并且存在一个中间投影。第 15 章的查询优化技术利用了这种等价性。

### 10.4.2 实现查询规划算法 (Implementing the Query Planning Algorithm)

SimpleDB 的 **`BasicQueryPlanner`** 类实现了基本的查询规划算法；其代码如 图 10.13 所示。代码中的四个步骤实现了该算法中对应的步骤。

**图 10.13 SimpleDB `BasicQueryPlanner` 类的代码 (The code for the SimpleDB class BasicQueryPlanner)**

```java
import simpledb.tx.Transaction;
import simpledb.metadata.MetadataMgr;
import simpledb.parse.Parser;
import simpledb.parse.QueryData;
import java.util.ArrayList;
import java.util.List;

public class BasicQueryPlanner implements QueryPlanner { // 假设 QueryPlanner 是一个接口
    private MetadataMgr mdm;

    public BasicQueryPlanner(MetadataMgr mdm) {
        this.mdm = mdm;
    }

    public Plan createPlan(QueryData data, Transaction tx) {
        // 步骤 1: 为每个提及的表或视图创建计划。
        List<Plan> plans = new ArrayList<Plan>();
        for (String tblname : data.tables()) {
            String viewdef = mdm.getViewDef(tblname, tx);
            if (viewdef != null) { // 如果是视图，则递归规划视图
                Parser parser = new Parser(viewdef);
                QueryData viewdata = parser.query();
                plans.add(createPlan(viewdata, tx));
            } else { // 否则，创建表计划
                plans.add(new TablePlan(tx, tblname, mdm));
            }
        }

        // 步骤 2: 创建所有表计划的乘积
        Plan p = plans.remove(0); // 取出第一个计划作为初始计划
        for (Plan nextplan : plans) // 将剩余的计划逐个与当前计划进行乘积操作
            p = new ProductPlan(p, nextplan);

        // 步骤 3: 添加一个谓词的选择计划
        p = new SelectPlan(p, data.pred());

        // 步骤 4: 对字段名称进行投影
        return new ProjectPlan(p, data.fields());
    }
}
```

基本的查询规划算法是**僵化且幼稚**的。它按照 `QueryData.tables` 方法返回的顺序生成乘积计划。请注意，这个顺序是完全任意的——任何其他表的顺序都会产生等效的扫描。因此，该算法的性能将是不稳定的（而且通常很差），因为它没有使用计划元数据来帮助确定乘积计划的顺序。

图 10.14 展示了规划算法的一个小改进。它仍然以相同的顺序考虑表，但现在为每个表创建两个乘积计划——一个作为乘积的左侧，一个作为右侧——并保留成本最小的计划。

**图 10.14 SimpleDB `BetterQueryPlanner` 类的代码 (The code for the SimpleDB class BetterQueryPlanner)**

```java
public class BetterQueryPlanner implements QueryPlanner {
    // ... 其他方法和字段（与 BasicQueryPlanner 相似）

    public Plan createPlan(QueryData data, Transaction tx) {
        // ... (步骤 1 与 BasicQueryPlanner 相同)
        List<Plan> plans = new ArrayList<Plan>();
        for (String tblname : data.tables()) {
            String viewdef = mdm.getViewDef(tblname, tx);
            if (viewdef != null) {
                Parser parser = new Parser(viewdef);
                QueryData viewdata = parser.query();
                plans.add(createPlan(viewdata, tx));
            } else {
                plans.add(new TablePlan(tx, tblname, mdm));
            }
        }

        // 步骤 2: 创建所有表计划的乘积
        // 在每一步，选择成本最小的计划
        Plan p = plans.remove(0); // 初始化为第一个计划
        for (Plan nextplan : plans) {
            // 尝试两种乘积顺序：(nextplan * p) 和 (p * nextplan)
            Plan p1 = new ProductPlan(nextplan, p);
            Plan p2 = new ProductPlan(p, nextplan);

            // 选择块访问次数较少的那个
            p = (p1.blocksAccessed() < p2.blocksAccessed() ? p1 : p2);
        }
        // ... (步骤 3 和 4 与 BasicQueryPlanner 相同)
        p = new SelectPlan(p, data.pred());
        return new ProjectPlan(p, data.fields());
    }
}
```

这个算法比基本的规划算法更好，但它仍然过于依赖查询中表的顺序。商业数据库系统中的规划算法要复杂得多。它们不仅分析许多等效计划的成本；它们还在特殊情况下实现可以应用的附加关系操作。它们的目标是选择最有效的计划（从而比竞争对手更具吸引力）。这些技术是第 12、13、14 和 15 章的主题。

### 10.5 更新规划（Update Planning）

本节讨论规划器应如何处理更新语句。SimpleDB 类 `BasicUpdatePlanner` 提供了一个简单的更新规划器实现；其代码如图 10.15 所示。该类为每种类型的更新操作提供了一个方法，以下小节将对这些方法进行详细说明。

```java
public class BetterQueryPlanner implements QueryPlanner {... 
public Plan createPlan(QueryData data, Transaction tx) {
    // 第 2 步：创建所有表计划的笛卡尔积
    // 每一步选择访问成本最小的计划
    Plan p = plans.remove(0);
    for (Plan nextplan : plans) {
        Plan p1 = new ProductPlan(nextplan, p);
        Plan p2 = new ProductPlan(p, nextplan);
        p = (p1.blocksAccessed() < p2.blocksAccessed() ? p1 : p2);
    }
    ...
}}
```

图 10.14 SimpleDB 类 `BetterQueryPlanner` 的代码

#### 10.5.1 删除与修改规划（Delete and Modify Planning）

删除（或修改）语句的扫描是一个选择扫描（select scan），用于检索需要删除或修改的记录。例如，考虑以下修改语句：

```sql
update STUDENT
set MajorId = 20
where MajorId = 30 and GradYear = 2020
```

以及下面的删除语句：

```sql
delete from STUDENT
where MajorId = 30 and GradYear = 2020
```

这些语句使用相同的扫描，即检索所有 2020 年毕业且专业编号为 30 的学生。方法 `executeDelete` 和 `executeModify` 都会创建并迭代这个扫描，对每条记录执行相应操作。在修改语句中，每条记录都会被修改；在删除语句中，每条记录都会被删除。

查看代码可以发现，这两个方法创建的计划相同，类似于查询规划器创建的计划（查询规划器还会增加一个投影计划）。两个方法都会打开扫描并以相同的方式迭代它。`executeDelete` 方法对扫描中的每条记录调用 `delete`，而 `executeModify` 方法则对每条记录的目标字段调用 `setVal`。两个方法都维护一个受影响记录的计数，并返回给调用者。

```java
public class BasicUpdatePlanner implements UpdatePlanner {
    private MetadataMgr mdm;
    
    public BasicUpdatePlanner(MetadataMgr mdm) {
        this.mdm = mdm;
    }

    public int executeDelete(DeleteData data, Transaction tx) {
        Plan p = new TablePlan(data.tableName(), tx, mdm);
        p = new SelectPlan(p, data.pred());
        UpdateScan us = (UpdateScan) p.open();
        int count = 0;
        while(us.next()) {
            us.delete();
            count++;
        }
        us.close();
        return count;
    }

    public int executeModify(ModifyData data, Transaction tx) {
        Plan p = new TablePlan(data.tableName(), tx, mdm);
        p = new SelectPlan(p, data.pred());
        UpdateScan us = (UpdateScan) p.open();
        int count = 0;
        while(us.next()) {
            Constant val = data.newValue().evaluate(us);
            us.setVal(data.targetField(), val);
            count++;
        }
        us.close();
        return count;
    }

    public int executeInsert(InsertData data, Transaction tx) {
        Plan p = new TablePlan(data.tableName(), tx, mdm);
        UpdateScan us = (UpdateScan) p.open();
        us.insert();
        Iterator<Constant> iter = data.vals().iterator();
        for (String fldname : data.fields()) {
            Constant val = iter.next();
            us.setVal(fldname, val);
        }
        us.close();
        return 1;
    }

    public int executeCreateTable(CreateTableData data, Transaction tx) {
        mdm.createTable(data.tableName(), data.newSchema(), tx);
        return 0;
    }

    public int executeCreateView(CreateViewData data, Transaction tx) {
        mdm.createView(data.viewName(), data.viewDef(), tx);
        return 0;
    }

    public int executeCreateIndex(CreateIndexData data, Transaction tx) {
        mdm.createIndex(data.indexName(), data.tableName(), data.fieldName(), tx);
        return 0;
    }
}
```

图 10.15 SimpleDB 类 `BasicUpdatePlanner` 的代码

#### 10.5.2 插入规划（Insert Planning）

插入语句对应的扫描只是对底层表的一个表扫描。`executeInsert` 方法首先在扫描中插入一条新记录，然后并行迭代 `fields` 和 `vals` 列表，调用 `setInt` 或 `setString` 修改记录中每个指定字段的值。

该方法返回 1，表示插入了一条记录。

#### 10.5.3 表、视图和索引创建规划（Planning for Table, View, and Index Creation）

方法 `executeCreateTable`、`executeCreateView` 和 `executeCreateIndex` 与其他方法不同，因为它们不需要访问任何数据记录，因此不需要扫描。它们仅调用元数据管理器的方法 `createTable`、`createView` 和 `createIndex`，使用解析器提供的相关信息，并返回 0 表示没有记录受到影响。

### 10.6 SimpleDB 的规划器（The SimpleDB Planner）

规划器是数据库引擎的一个组件，用于将 SQL 语句转换为执行计划。SimpleDB 的规划器由 `Planner` 类实现，其 API 如图 10.16 所示。

两个方法的第一个参数都是 SQL 语句的字符串表示。

- `createQueryPlan` 方法为输入的查询字符串创建并返回一个执行计划。
- `executeUpdate` 方法为输入的字符串创建计划并执行它，然后返回受影响的记录数（类似 JDBC 中的 `executeUpdate` 方法）。

客户端可以通过调用 `SimpleDB` 类中的静态方法 `planner` 来获取一个 `Planner` 对象。图 10.17 展示了 `PlannerTest` 类的代码，演示了如何使用规划器。

- 代码的第一部分演示了 SQL 查询的处理。查询字符串被传入规划器的 `createQueryPlan` 方法，返回一个计划。打开该计划会得到一个扫描（scan），然后可以访问并打印记录。
- 代码的第二部分演示了 SQL 更新命令的处理。

```java
public Plan createQueryPlan(String query, Transaction tx);
public int executeUpdate(String cmd, Transaction tx);
```

图 10.16 SimpleDB 规划器的 API

```java
public class PlannerTest {
    public static void main(String[] args) {
        SimpleDB db = new SimpleDB("studentdb");
        Planner planner = db.planner();
        Transaction tx = db.newTx();

        // part 1: 处理查询
        String qry = "select sname, gradyear from student";
        Plan p = planner.createQueryPlan(qry, tx);
        Scan s = p.open();
        while (s.next())
            System.out.println(s.getString("sname") + " " + s.getInt("gradyear"));
        s.close();

        // part 2: 处理更新命令
        String cmd = "delete from STUDENT where MajorId = 30";
        int num = planner.executeUpdate(cmd, tx);
        System.out.println(num + " students were deleted");
        tx.commit();
    }
}
```

图 10.17 `PlannerTest` 类

1. **解析 SQL 语句**：方法调用解析器（parser），传入输入字符串；解析器返回一个包含 SQL 语句信息的对象。例如，查询语句返回 `QueryData` 对象，插入语句返回 `InsertData` 对象，依此类推。
2. **验证 SQL 语句**：方法检查 `QueryData`（或 `InsertData` 等）对象，判断其语义是否有效。
3. **创建 SQL 执行计划**：方法使用规划算法生成与语句对应的查询树，并基于该树创建计划。
   4a. **返回计划**（`createQueryPlan` 方法）
   4b. **执行计划**（`executeUpdate` 方法）：方法通过打开计划生成扫描，然后迭代扫描，对每条记录执行相应的更新，并返回受影响的记录数。

图 10.18 总结了 `createQueryPlan` 和 `executeUpdate` 的执行步骤：

命令字符串被传入规划器的 `executeUpdate` 方法，由该方法完成所有必要操作。

SimpleDB 的规划器有两个方法：一个处理查询，一个处理更新。两个方法的输入处理方式非常类似，主要区别在于它们如何处理生成的计划：

- `createQueryPlan` 直接返回计划
- `executeUpdate` 打开并执行计划

```java
public class Planner {
    private QueryPlanner qplanner;
    private UpdatePlanner uplanner;

    public Planner(QueryPlanner qplanner, UpdatePlanner uplanner) {
        this.qplanner = qplanner;
        this.uplanner = uplanner;
    }

    public Plan createQueryPlan(String cmd, Transaction tx) {
        Parser parser = new Parser(cmd);
        QueryData data = parser.query();
        // 此处应验证查询语句...
        return qplanner.createPlan(data, tx);
    }

    public int executeUpdate(String cmd, Transaction tx) {
        Parser parser = new Parser(cmd);
        Object obj = parser.updateCmd();
        // 此处应验证更新命令...
        if (obj instanceof InsertData)
            return uplanner.executeInsert((InsertData)obj, tx);
        else if (obj instanceof DeleteData)
            return uplanner.executeDelete((DeleteData)obj, tx);
        else if (obj instanceof ModifyData)
            return uplanner.executeModify((ModifyData)obj, tx);
        else if (obj instanceof CreateTableData)
            return uplanner.executeCreateTable((CreateTableData)obj, tx);
        else if (obj instanceof CreateViewData)
            return uplanner.executeCreateView((CreateViewData)obj, tx);
        else if (obj instanceof CreateIndexData)
            return uplanner.executeCreateIndex((CreateIndexData)obj, tx);
        else
            return 0; // 理论上不会出现
    }
}
```

图 10.19 SimpleDB 类 `Planner` 的代码

`Planner` 对象依赖查询规划器（QueryPlanner）和更新规划器（UpdatePlanner）来执行实际规划。这些对象通过 `Planner` 构造函数传入，从而可以用不同的规划算法配置规划器。例如，第 15 章介绍了一个高级查询规划器 `HeuristicQueryPlanner`；只需将其对象传入 `Planner` 构造函数，就可以替代 `BasicQueryPlanner`。这种可插拔能力通过 Java 接口实现。

`Planner` 构造函数的参数属于接口 `QueryPlanner` 和 `UpdatePlanner`，其代码如图 10.20。`BasicQueryPlanner` 和 `BasicUpdatePlanner` 类实现了这些接口，第 15 章的高级规划器也实现了这些接口。

`Planner` 对象由 `SimpleDB` 类的构造函数创建，构造函数会创建一个基本查询规划器和一个基本更新规划器，并将它们传给 `Planner` 构造函数，如图 10.21 所示。若想更换查询规划器，只需修改 `SimpleDB` 构造函数以创建不同的 `QueryPlanner` 和 `UpdatePlanner` 对象即可。

```java
public interface QueryPlanner {
    public Plan createPlan(QueryData data, Transaction tx);
}

public interface UpdatePlanner {
    public int executeInsert(InsertData data, Transaction tx);
    public int executeDelete(DeleteData data, Transaction tx);
    public int executeModify(ModifyData data, Transaction tx);
    public int executeCreateTable(CreateTableData data, Transaction tx);
    public int executeCreateView(CreateViewData data, Transaction tx);
    public int executeCreateIndex(CreateIndexData data, Transaction tx);
}
```

图 10.20 SimpleDB 的 `QueryPlanner` 和 `UpdatePlanner` 接口代码

```java
public SimpleDB(String dirname) {
    ...
    mdm = new MetadataMgr(isnew, tx);
    QueryPlanner qp = new BasicQueryPlanner(mdm);
    UpdatePlanner up = new BasicUpdatePlanner(mdm);
    planner = new Planner(qp, up);
    ...
}
```

图 10.21 SimpleDB 创建其规划器的代码

### 10.7 本章小结（Chapter Summary）

- 为了构造给定查询的最优成本扫描，数据库系统需要估算遍历一个扫描所需的块访问数。对于扫描 `s`，定义了以下估算函数：
  - `B(s)` 表示遍历扫描 `s` 所需的块访问数。
  - `R(s)` 表示扫描 `s` 输出的记录数。
  - `V(s, F)` 表示扫描 `s` 输出中字段 `F` 的不同取值个数。
- 如果 `s` 是表扫描，那么这些函数等价于该表的统计元数据；否则，每个操作符都有一个公式，根据其输入扫描的函数值计算输出函数值。
- 一个 SQL 查询可能有多个等价的查询树，每棵树对应不同的扫描。数据库规划器负责创建估算成本最低的扫描。为此，规划器可能需要构造多个查询树并比较它们的成本，最终只为成本最低的树创建扫描。
- 为比较成本而构建的查询树称为计划（plan）。计划与扫描在概念上类似，都表示查询树，不同之处在于计划具有估算成本的方法；它访问数据库元数据，但不访问实际数据。创建计划不产生磁盘访问。规划器会创建多个计划并比较成本，然后选择成本最低的计划并打开执行。
- 规划器是数据库引擎中将 SQL 语句转换为执行计划的组件。
- 此外，规划器会验证语句的语义是否有效，包括：
  - 指定的表和字段在目录中确实存在
  - 指定字段不歧义
  - 对字段的操作类型正确
  - 所有常量的类型和大小与字段匹配
- 基本查询规划算法创建一个初步的执行计划，步骤如下：
  1. 为 `from` 子句中的每个表 `T` 构建计划
     - 如果 `T` 是存储表，则计划为该表的表计划
     - 如果 `T` 是视图，则递归调用此算法生成 `T` 的定义计划
  2. 按 `from` 子句顺序对表取笛卡尔积
  3. 对 `where` 子句中的谓词进行选择（select）
  4. 对 `select` 子句中的字段进行投影（project）
- 基本查询规划算法生成的计划是简单且通常低效的。商业数据库系统中的规划算法会对各种等价计划进行深入分析，第 15 章将详细描述。
- 删除（delete）和修改（modify）语句处理方式相似。规划器会创建选择计划（select plan），检索要删除或修改的记录。`executeDelete` 和 `executeModify` 方法会打开计划，迭代扫描，对每条记录执行相应操作。修改语句会修改记录，删除语句会删除记录。
- 插入语句（insert）的计划是底层表的表计划。`executeInsert` 方法打开计划并向扫描中插入新记录。
- 创建语句（create table/view/index）的计划不需要访问数据，因此无需创建计划。相应的方法直接调用元数据方法执行创建操作。

### 10.8 推荐阅读（Suggested Reading）

本章的规划器只理解 SQL 的一小部分，对于复杂构造的规划问题只做了简要介绍：

- Kim (1982) 描述了嵌套查询的问题，并提出解决方案
- Chaudhuri (1998) 讨论了 SQL 中外连接（outer join）和嵌套查询等复杂问题的优化策略

参考文献：

- Chaudhuri, S. (1998). *An overview of query optimization in relational systems*. Proceedings of the ACM Principles of Database Systems Conference, pp. 34–43.
- Kim, W. (1982). *On optimizing an SQL-like nested query*. ACM Transactions on Database Systems, 7(3), 443–469.

### 10.9 练习（Exercises）

#### 概念练习（Conceptual Exercises）

**10.1** 考虑如下关系代数查询：

```
T1 = select(DEPT, DName='math')
T2 = select(STUDENT, GradYear=2018)
product(T1, T2)
```

根据第 10.2 节的假设：
(a) 计算执行该操作所需的磁盘访问数
(b) 如果交换 `product` 的参数，计算所需的磁盘访问数

**10.2** 计算图 10.11 和 10.12 的查询的 `B(s)`、`R(s)` 和 `V(s,F)`

**10.3** 证明如果交换第 10.2.5 节中 `product` 操作的参数，则整个操作需要 4502 块访问

**10.4** 第 10.2.4 节指出，当 STUDENT 为外层扫描时，STUDENT × DEPT 的笛卡尔积更高效。利用图 7.8 的统计信息，计算所需的块访问数

**10.5** 对以下 SQL 语句，画出本章基本规划器生成的计划图
(a)

```sql
select SName, Grade
from STUDENT, COURSE, ENROLL, SECTION
where SId = StudentId and SectId = SectionId and CourseId = CId and Title = 'Calculus'
```

(b)

```sql
select SName
from STUDENT, ENROLL
where MajorId = 10 and SId = StudentId and Grade = 'C'
```

**10.6** 对练习 10.5 的查询，说明规划器必须检查哪些内容以验证正确性

**10.7** 对以下更新语句，说明规划器必须检查哪些内容以验证正确性
(a)

```sql
insert into STUDENT(SId, SName, GradYear, MajorId)
values(120, 'abigail', 2012, 30)
```

(b)

```sql
delete from STUDENT
where MajorId = 10 and SID in (
  select StudentId from ENROLL where Grade = 'F'
)
```

(c)

```sql
update STUDENT
set GradYear = GradYear + 3
where MajorId in (
  select DId from DEPT where DName = 'drama'
)
```

#### 编程练习（Programming Exercises）

**10.8** SimpleDB 规划器未验证表名是否存在
(a) 查询中提及不存在表会发生什么问题？
(b) 修改 `Planner` 类验证表名，不存在时抛出 `BadSyntaxException`

**10.9** SimpleDB 规划器未验证字段名存在且唯一
(a) 查询中提及不存在字段会发生什么问题？
(b) 查询中涉及具有相同字段名的表会发生什么问题？
(c) 修改代码进行适当验证

**10.10** SimpleDB 规划器未进行谓词类型检查
(a) 谓词类型不正确会导致什么问题？
(b) 修改代码进行类型验证

**10.11** SimpleDB 更新规划器未验证插入语句中字符串常量的类型、大小以及常量列表与字段列表长度
**10.12** SimpleDB 更新规划器未验证修改语句中赋值的类型正确性

**10.13–10.22** 包含一系列高级练习：

- 实现重命名（RenamePlan）、扩展（ExtendPlan）、并集（UnionPlan）、半连接/反连接（SemijoinPlan/AntijoinPlan）等计划对象
- 修改基本查询规划器以支持这些新计划
- 修改解析器以支持 `AS`、`UNION`、嵌套查询和 `*`
- 修改插入/更新规划器以支持视图、优化插入位置等
- 通过 JDBC 编写客户端程序测试这些功能
- 修改 SimpleDB 服务器以打印查询及其计划，帮助理解查询执行过程

