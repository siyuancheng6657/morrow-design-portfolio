export const categories = ['全部', '餐厨器皿', '家居好物', '香氛日常', '布艺织物'];
export const initialProducts = [
  { id: 'mug', name: '晨光手作陶瓷杯', subtitle: '把温热的片刻，捧在手心。', category: '餐厨器皿', price: 89, originalPrice: 109, stock: 36, status: 'active', image: 'assets/mug.png', tone: '奶油白', material: '高温烧制陶瓷 · 320ml', description: '圆润的杯身、温柔的哑光釉面。一杯咖啡的时间，也可以成为认真生活的小仪式。' },
  { id: 'lamp', name: '暖暮褶纸台灯', subtitle: '留一盏灯，等日常慢下来。', category: '家居好物', price: 269, originalPrice: 329, stock: 18, status: 'active', image: 'assets/lamp.png', tone: '胡桃木色', material: '胡桃木底座 · 织物灯罩 · 暖光', description: '轻盈的褶皱让光柔和地散开。放在床头或阅读角，陪伴每一个安静的夜晚。' },
  { id: 'vase', name: '山间陶瓷花器', subtitle: '一枝绿意，就是一处风景。', category: '家居好物', price: 159, originalPrice: 189, stock: 24, status: 'active', image: 'assets/vase.png', tone: '砂岩米', material: '细砂陶土 · 高约24cm', description: '质朴的肌理与自然的曲线，让枝叶自在伸展。无需繁复的搭配，就能为家带来一点呼吸。' },
  { id: 'linen', name: '云朵亚麻盖毯', subtitle: '轻轻裹住，一整个慵懒午后。', category: '布艺织物', price: 229, originalPrice: 269, stock: 12, status: 'active', image: 'assets/linen.png', tone: '燕麦色', material: '亚麻棉混纺 · 130 × 170cm', description: '自然纤维保留细腻的触感，柔软流苏随意垂落。为沙发加一层温度，也为生活留一份从容。' }
];
export const initialCampaign = { title: '让日常，\n慢下来。', subtitle: '从一只杯子、一盏灯开始，\n为生活留一点温柔的空白。', enabled: true };
export const money = (value) => Number(value).toFixed(2).replace(/\.00$/, '');
