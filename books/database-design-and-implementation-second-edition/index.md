---
sidebar_position: 2
typora-root-url: ./..\..\static
---

# Database Design and Implementation Second Edition 中文翻译

## 简介

《Database Design and Implementation Second Edition》是一本深入探讨数据库系统设计与实现的经典著作。本项目旨在将该书翻译成中文，使中文读者能够更好地学习和理解数据库系统的核心概念。

## 目标读者

- 数据库系统开发者和工程师
- 计算机科学研究人员
- 文件系统开发者
- 对数据库内核设计感兴趣的工程师


## 内容目录

1. ### [数据库系统（Database Systems）](content/chapters/chapter1.md#数据库系统database-system)

   - 1.1 为什么要使用数据库系统？（Why a Database System?）
   - 1.2 Derby 数据库系统（The Derby Database System）
   - 1.3 数据库引擎（Database Engines）
   - 1.4 SimpleDB 数据库系统（The SimpleDB Database System）
   - 1.5 SimpleDB 版 SQL（The SimpleDB Version of SQL）
   - 1.6 本章小结（Chapter Summary）
   - 1.7 建议阅读（Suggested Reading）
   - 1.8 习题（Exercises）

2. ###  [JDBC（JDBC）](content/chapters/chapter2.md#jdbc)

   - 2.1 基本 JDBC（Basic JDBC）
   - 2.2 高级 JDBC（Advanced JDBC）
   - 2.3 Java 与 SQL 中的计算（Computing in Java vs. SQL）
   - 2.4 本章小结（Chapter Summary）
   - 2.5 建议阅读（Suggested Reading）
   - 2.6 习题（Exercises）

3. ###  [磁盘与文件管理（Disk and File Management）](content/chapters/chapter3.md#第-3-章-磁盘和文件管理-chapter-3-disk-and-file-management)

   - 3.1 持久化数据存储（Persistent Data Storage）
   - 3.2 块级磁盘接口（The Block-Level Interface to the Disk）
   - 3.3 文件级磁盘接口（The File-Level Interface to the Disk）
   - 3.4 数据库系统与操作系统（The Database System and the OS）
   - 3.5 SimpleDB 文件管理器（The SimpleDB File Manager）
   - 3.6 本章小结（Chapter Summary）
   - 3.7 建议阅读（Suggested Reading）
   - 3.8 习题（Exercises）

4. ###   [内存管理（Memory Management）](content/chapters/chapter4.md#第-4-章-内存管理-chapter-4-memory-management)

   - 4.1 数据库内存管理的两大原则（Two Principles of Database Memory Management）
   - 4.2 日志信息管理（Managing Log Information）
   - 4.3 SimpleDB 日志管理器（The SimpleDB Log Manager）
   - 4.4 用户数据管理（Managing User Data）
   - 4.5 SimpleDB 缓冲管理器（The SimpleDB Buffer Manager）
   - 4.6 本章小结（Chapter Summary）
   - 4.7 建议阅读（Suggested Reading）
   - 4.8 习题（Exercises）

5. ### [事务管理（Transaction Management）](content/chapters/chapter5.md#第-5-章-事务管理-chapter-5-transaction-management)

   - 5.1 事务（Transactions）
   - 5.2 在 SimpleDB 中使用事务（Using Transactions in SimpleDB）
   - 5.3 恢复管理（Recovery Management）
   - 5.4 并发管理（Concurrency Management）
   - 5.5 实现 SimpleDB 事务（Implementing SimpleDB Transactions）
   - 5.6 本章小结（Chapter Summary）
   - 5.7 建议阅读（Suggested Reading）
   - 5.8 习题（Exercises）

6. ### [记录管理（Record Management）](content/chapters/chapter6.md#第-6-章-记录管理-record-management)

   - 6.1 记录管理器设计（Designing a Record Manager）
   - 6.2 记录文件的实现（Implementing a File of Records）
   - 6.3 SimpleDB 记录页（SimpleDB Record Pages）
   - 6.4 SimpleDB 表扫描（SimpleDB Table Scans）
   - 6.5 本章小结（Chapter Summary）
   - 6.6 建议阅读（Suggested Reading）
   - 6.7 习题（Exercises）

7. ###   [元数据管理（Metadata Management）](content/chapters/chapter7.md#第-7-章-元数据管理metadata-management)

   - 7.1 元数据管理器（The Metadata Manager）
   - 7.2 表元数据（Table Metadata）
   - 7.3 视图元数据（View Metadata）
   - 7.4 统计元数据（Statistical Metadata）
   - 7.5 索引元数据（Index Metadata）
   - 7.6 实现元数据管理器（Implementing the Metadata Manager）
   - 7.7 本章小结（Chapter Summary）
   - 7.8 建议阅读（Suggested Reading）
   - 7.9 习题（Exercises）

8. ###  [查询处理（Query Processing）](content/chapters/chapter8.md#第-8-章-查询处理query-processing)

   - 8.1 关系代数（Relational Algebra）
   - 8.2 扫描（Scans）
   - 8.3 更新扫描（Update Scans）
   - 8.4 扫描的实现（Implementing Scans）
   - 8.5 管道化查询处理（Pipelined Query Processing）
   - 8.6 谓词（Predicates）
   - 8.7 本章小结（Chapter Summary）
   - 8.8 建议阅读（Suggested Reading）
   - 8.9 习题（Exercises）

9. ###   [解析（Parsing）](content/chapters/chapter9.md#第-9-章-解析-parsing)

   - 9.1 语法与语义（Syntax Versus Semantics）
   - 9.2 词法分析（Lexical Analysis）
   - 9.3 SimpleDB 词法分析器（The SimpleDB Lexical Analyzer）
   - 9.4 文法（Grammars）
   - 9.5 递归下降解析器（Recursive-Descent Parsers）
   - 9.6 在解析器中添加动作（Adding Actions to the Parser）
   - 9.7 本章小结（Chapter Summary）
   - 9.8 建议阅读（Suggested Reading）
   - 9.9 习题（Exercises）

10. ###   [查询规划（Planning）](content/chapters/chapter10.md#第-10-章-规划-planning)

    - 10.1 验证（Verification）
    - 10.2 查询树评估成本（The Cost of Evaluating a Query Tree）
    - 10.3 执行计划（Plans）
    - 10.4 查询规划（Query Planning）
    - 10.5 更新规划（Update Planning）
    - 10.6 SimpleDB 规划器（The SimpleDB Planner）
    - 10.7 本章小结（Chapter Summary）
    - 10.8 建议阅读（Suggested Reading）
    - 10.9 习题（Exercises）

11. ### [JDBC 接口（JDBC Interfaces）](content/chapters/chapter11.md#第-11-章-jdbc-接口-jdbc-interfaces)

    - 11.1 SimpleDB API（The SimpleDB API）
    - 11.2 嵌入式 JDBC（Embedded JDBC）
    - 11.3 远程方法调用（Remote Method Invocation）
    - 11.4 远程接口的实现（Implementing the Remote Interfaces）
    - 11.5 JDBC 接口的实现（Implementing the JDBC Interfaces）
    - 11.6 本章小结（Chapter Summary）
    - 11.7 建议阅读（Suggested Reading）
    - 11.8 习题（Exercises）

12. ###  索引（Indexing）

    - 12.1 索引的价值（The Value of Indexing）
    - 12.2 SimpleDB 索引（SimpleDB Indexes）
    - 12.3 静态哈希索引（Static Hash Indexes）
    - 12.4 可扩展哈希索引（Extendable Hash Indexes）
    - 12.5 B 树索引（B-Tree Indexes）
    - 12.6 索引感知的操作实现（Index-Aware Operator Implementations）
    - 12.7 索引更新规划（Index Update Planning）
    - 12.8 本章小结（Chapter Summary）
    - 12.9 建议阅读（Suggested Reading）
    - 12.10 习题（Exercises）

13. ### 物化与排序（Materialization and Sorting）

    - 13.1 物化的价值（The Value of Materialization）
    - 13.2 临时表（Temporary Tables）
    - 13.3 物化（Materialization）
    - 13.4 排序（Sorting）
    - 13.5 分组与聚合（Grouping and Aggregation）
    - 13.6 归并连接（Merge Joins）
    - 13.7 本章小结（Chapter Summary）
    - 13.8 建议阅读（Suggested Reading）
    - 13.9 习题（Exercises）

14. ### 高效缓冲利用（Effective Buffer Utilization）

    - 14.1 查询计划中的缓冲使用（Buffer Usage in Query Plans）
    - 14.2 多缓冲排序（Multibuffer Sorting）
    - 14.3 多缓冲笛卡尔积（Multibuffer Product）
    - 14.4 缓冲分配策略（Determining Buffer Allocation）
    - 14.5 多缓冲排序的实现（Implementing Multibuffer Sorting）
    - 14.6 多缓冲笛卡尔积的实现（Implementing Multibuffer Product）
    - 14.7 哈希连接（Hash Joins）
    - 14.8 连接算法比较（Comparing the Join Algorithms）
    - 14.9 本章小结（Chapter Summary）
    - 14.10 建议阅读（Suggested Reading）
    - 14.11 习题（Exercises）

15. ###   查询优化（Query Optimization）

    - 15.1 等价查询树（Equivalent Query Trees）
    - 15.2 查询优化的必要性（The Need for Query Optimization）
    - 15.3 查询优化器结构（The Structure of a Query Optimizer）
    - 15.4 寻找最优查询树（Finding the Most Promising Query Tree）
    - 15.5 寻找最高效执行计划（Finding the Most Efficient Plan）
    - 15.6 优化的两阶段结合（Combining the Two Stages of Optimization）
    - 15.7 查询块合并（Merging Query Blocks）
    - 15.8 本章小结（Chapter Summary）
    - 15.9 建议阅读（Suggested Reading）
    - 15.10 习题（Exercises）

### 6. 配套源码

[SimpleDB](https://github.com/BruceBlink/simpledb)

## 翻译进度

- [x] 第1章：数据库系统（Database Systems）
- [x] 第2章：JDBC
- [x] 第3章：磁盘与文件管理（Disk and File Management）
- [x] 第4章：内存管理（Memory Management）
- [x] 第5章： 事务管理（Transaction Management）
- [x] 第6章： 记录管理（Record Management）
- [x] 第7章： 元数据管理（Metadata Management）
- [x] 第8章： 查询处理（Query Processing）
- [x] 第9章： 解析（Parsing）
- [ ] 第10章： 查询计划（Planning）
- [x] 第11章：  JDBC 接口（JDBC Interfaces）
- [ ] 第12章： 索引（Indexing）
- [ ] 第13章：物化与排序（Materialization and Sorting）
- [ ] 第14章： 高效缓冲利用（Effective Buffer Utilization）
- [ ] 第15章： 查询优化（Query Optimization）

## 参与贡献

我们欢迎各种形式的贡献，包括但不限于：

- 翻译新的章节
- 校对已翻译的内容
- 改进项目文档
- 报告问题或提出建议

## 许可证

本项目采用 MIT 许可证。原著作权属于原作者。
