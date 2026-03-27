---
id: 6
title: Python 字典基础与风机发电量案例
date: "2026-03-27 16:00"
tags:
  - Python
  - 字典
  - 数据结构
  - 案例
summary: 通过风机编号与发电量的案例，系统学习了 Python 字典的创建、遍历、排序查找最大值等常用操作，适合初学者入门和实践。
---
## 1. 字典的创建

- 字典是一种以'键-值'对形式存储数据的数据结构。
- 可以用 dict(zip(keys, values)) 方式将两个列表合并为字典。

示例：
```python
turbines = ["WT01", "WT02", "WT03", "WT04", "WT05"]
power = [3200, 2850, 3400, 3100, 2850]
wind_dict = dict(zip(turbines, power))
```

## 2. 字典的遍历

- 使用 for key, value in dict.items() 可以遍历所有键值对。

示例：
```python
for turbine, gen in wind_dict.items():
    print(f"风机编号: {turbine}, 发电量: {gen}")
```

## 3. 查找最大值（非max写法）

- 可用 sorted(dict.items(), key=lambda x: x[1]) 按值排序，取最后一个即为最大值对应的键。

示例：
```python
sorted_turbines = sorted(wind_dict.items(), key=lambda x: x[1])
max_turbine = sorted_turbines[-1][0]
print(f"发电量最高的风机编号: {max_turbine}")
```

## 4. 总结

- 字典适合存储一一对应的数据关系，查找和遍历都非常高效。
- 除了常用的 max，还可以用排序等方式查找最大值，灵活掌握多种写法有助于提升编程能力。
