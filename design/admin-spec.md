# MORROW 运营工作台设计规范

设计基准：`admin-concept.png`，由内置 Image Gen 生成并于编码前审阅。设计意图为安静、清楚、具有生活方式品牌辨识度的运营工具。

- 画布暖纸色 `#f7f5f0`；固定宽侧栏 `#263d34`；内容面板纯白 `#fff`；边线 `#dedfd7`；次级文字 `#777970`；强调色 `#ac664b`。
- 侧栏桌面宽 216px，包含 MORROW 字标、植物线稿圆标、商品管理 / 首页内容 / 订单记录三个真实功能入口，底部为返回商城和本地演示说明。
- 主区依次为顶栏面包屑、页标题与操作、四列基础统计、搜索分类工具栏、商品表、同步说明。不要增加图表、营业额或无业务意义的装饰卡片。
- 字体系统：系统无衬线 / Microsoft YaHei；品牌字标与大标题采用 Georgia / Songti SC / SimSun。页面标题 34px，正文 14px，次级信息 12px，数值 28px。
- 控件 42px 高，圆角 4px；线性图标 18px、1.5px 描边；表格行高约 82px；照片 52px 正方形，无滤镜或叠色。
- 表格字段为商品信息、分类、售价、库存、状态、操作。所有文案、图标、状态和输入控件由代码绘制；商品图片复用独立商品摄影资产。
- 概念图中的统计和商品只是构图示例；实际界面所有统计由 products / orders 计算，分类以业务约定四类为准。不存在后端营收、真实支付或服务端保存声明。
- 编辑商品使用同一风格的原生 dialog，双列表单在窄屏变为单列；支持名称、说明、分类、价格、划线价、库存、材质、配色、图片、上下架状态。
- 首页内容沿用白色边框面板与左右分栏：左侧编辑、右侧品牌色预览；保存后更新首页 campaign。
- 订单记录使用与商品表同族表格，数据取自商城演示订单；空状态说明购物闭环入口。
- 390px 移动端：侧栏变为品牌栏与横向导航，统计 2×2 排列，工具栏换行，表格自身水平滚动，页面无横向溢出；dialog 全屏边距 12px。
- 核心流程：搜索与分类 / 状态筛选、创建或编辑商品、验证价格和库存、上下架、CSV 导出、首页活动保存、订单记录查看、返回商城。所有表单错误需直观显示，键盘可操作。

## Image Gen prompt

Use case: ui-mockup. Complete 1536×1024 desktop MORROW / 日常之间 Chinese housewares product administration screenshot. Forest sidebar, warm paper canvas, white table panel, restrained terracotta accent. Full interface: brand/sidebar navigation, breadcrumb, 商品管理 heading and new-product button, four true-demo-data metrics 商品总数 / 正在销售 / 库存不足 / 演示订单, search/category toolbar and CSV export, six visible product rows with product thumbnails and columns 商品信息 / 分类 / 售价 / 库存 / 状态 / 操作, pagination footprint and sync note. Practical code-native text/controls, separable photography, no charts, no fake revenue, no unrelated navigation. Mobile continuation uses compact navigation and scrollable table. Editing uses same-style focused modal.
