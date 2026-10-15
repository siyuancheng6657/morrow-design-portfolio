import React, { useState, useRef } from 'react';
import { Search, ShoppingBag, ArrowRight, Leaf, Package, Truck, X } from 'lucide-react';
import { categories, money } from '../data.js';

export function Brand({ onClick }) { return <button className="brand" onClick={onClick} aria-label="MORROW 返回首页"><span>MORROW</span><small>日常之间</small></button>; }

export default function Shop({ products, campaign, cartCount, onCart, onProduct, onAdd, onNavigate, notify }) {
  const [category, setCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState('default');
  const searchRef = useRef(null);
  const collectionRef = useRef(null);
  const browse = (next = '全部') => { setCategory(next); collectionRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const items = products.filter(p => p.status === 'active' && (category === '全部' || p.category === category) && `${p.name} ${p.subtitle} ${p.material} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b) => sort === 'low' ? a.price-b.price : sort === 'high' ? b.price-a.price : 0);
  const openSearch = () => { setSearchOpen(v => !v); setTimeout(() => searchRef.current?.focus(), 50); };
  return <>
    <div className="announcement">秋日上新 · 把喜欢的日常带回家</div>
    <header className="site-header"><Brand onClick={() => window.scrollTo({top:0,behavior:'smooth'})}/><nav aria-label="主导航"><button className="active" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>首页</button><button onClick={() => browse()}>精选好物</button><button onClick={() => document.getElementById('story').scrollIntoView({behavior:'smooth'})}>生活灵感</button><button onClick={() => onNavigate('portfolio')}>关于我们</button></nav><div className="header-tools"><button className="icon-button" aria-label="搜索商品" onClick={openSearch} aria-expanded={searchOpen}><Search size={22}/></button><button className="icon-button bag-button" aria-label={`购物袋，${cartCount}件商品`} onClick={onCart}><ShoppingBag size={22}/>{cartCount > 0 && <span>{cartCount}</span>}</button></div></header>
    {searchOpen && <form className="search-panel" onSubmit={e => { e.preventDefault(); browse(); }}><Search size={20}/><input ref={searchRef} aria-label="搜索商品名称或材质" value={query} onChange={e => {setQuery(e.target.value);}} placeholder="寻找一件喜欢的好物，例如：陶瓷、亚麻…"/><button type="submit" className="text-button">搜索</button><button type="button" className="icon-button" aria-label="清除并关闭搜索" onClick={() => {setQuery('');setSearchOpen(false);}}><X size={20}/></button></form>}
    <main id="main-content">
      {campaign.enabled && <section className="hero"><div className="hero-copy"><h1>{campaign.title}</h1><p>{campaign.subtitle}</p><div className="hero-actions"><button className="button" onClick={() => browse()}>探索秋日精选<ArrowRight size={19}/></button><button className="underlined" onClick={() => browse()}>浏览全部好物</button></div></div><div className="hero-image"><img src="assets/hero.png" alt="阳光洒进客厅，胡桃木茶几上摆着陶瓷杯和花器" fetchPriority="high"/></div></section>}
      <div className="service-strip"><div><Leaf/><span>精选天然材质<small>取自自然，回归生活本真</small></span></div><div><Package/><span>7天无理由退换<small>让喜欢，更加安心</small></span></div><div><Truck/><span>满199元包邮<small>把美好的日常，送到你家</small></span></div></div>
      <section className="collection page-width" ref={collectionRef} id="collection"><div className="section-head"><div><h2>把喜欢，带进生活</h2><p className="english-caption">EVERYDAY FAVORITES</p></div><div className="category-tabs" role="tablist" aria-label="商品分类">{categories.map(c => <button role="tab" aria-selected={category===c} className={category===c?'selected':''} key={c} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
        {(query || category !== '全部') && <div className="results-line"><p>{query ? `“${query}” · ` : ''}{items.length} 件好物</p><label>排序<select aria-label="商品排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">精选推荐</option><option value="low">价格从低到高</option><option value="high">价格从高到低</option></select></label></div>}
        {items.length ? <div className="product-grid">{items.map(p=><article className="product" key={p.id}><button className="product-photo" onClick={()=>onProduct(p.id)} aria-label={`查看${p.name}`}><img src={p.image} alt={p.name} loading="lazy"/><span className="photo-hover">看看这件好物<ArrowRight size={17}/></span>{!p.stock && <span className="sold-out">暂时售罄</span>}</button><p className="product-category">{p.category}</p><button className="product-name" onClick={()=>onProduct(p.id)}>{p.name}</button><div className="product-bottom"><span className="price">¥{money(p.price)}</span><button className="round-button" disabled={!p.stock} aria-label={`将${p.name}加入购物袋`} onClick={()=>onAdd(p.id)}><ShoppingBag size={18}/></button></div></article>)}</div> : <div className="empty-state"><Search size={32}/><h3>还没有找到这件好物</h3><p>{category==='香氛日常'&&!query?'香氛系列正在准备中，先看看其他日常灵感。':'换个关键词，或者逛逛其他分类。'}</p><button className="button" onClick={()=>{setQuery('');setCategory('全部');}}>浏览全部好物<ArrowRight size={18}/></button></div>}
      </section>
      <section className="story" id="story"><img src="assets/hero.png" alt="自然光下安静的家居阅读角" loading="lazy"/><div className="story-copy"><p className="english-caption">THE ART OF SLOW LIVING</p><h2>好好生活，<br/>从身边的小事开始。</h2><p>我们寻找经得起时间的材质，也珍惜每一个平凡而具体的日常。</p><button className="underlined" onClick={()=>onNavigate('portfolio')}>认识 MORROW<ArrowRight size={18}/></button></div></section>
    </main>
    <footer className="site-footer"><Brand onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}/><div><button onClick={()=>notify('购物指南：选购好物 → 加入购物袋 → 填写演示配送信息 → 生成演示订单。满199元免运费，否则运费12元。')}>购物指南</button><button onClick={()=>onNavigate('portfolio')}>品牌故事</button><button onClick={()=>onNavigate('portfolio')}>作品说明</button><button onClick={()=>onNavigate('admin')}>运营后台</button></div><p>© 2026 MORROW · 概念品牌与应聘作品，所有商品及交易均为演示。</p></footer>
  </>;
}
