import React, { useId, useRef, useState } from 'react';
import './admin.css';

const CATEGORIES = ['家居好物', '餐厨器皿', '香氛日常', '布艺织物'];
const money = (value) => `¥ ${Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
const defaultProduct = { name: '', subtitle: '', category: CATEGORIES[0], price: '', originalPrice: '', stock: '', status: 'draft', image: '', tone: '', material: '' };

function AdminIcon({ name, size = 18 }) {
  const paths = {
    tag: <><path d="M20 13 13 20 3 10V3h7Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    home: <><path d="m3 10 9-8 9 8M5 9v12h14V9" /><path d="M9 21v-8h6v8" /></>,
    list: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h6" /></>,
    arrow: <><path d="M13 3h8v8M21 3 10 14" /><path d="M11 3H3v18h18v-8" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    download: <><path d="M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.list}</svg>;
}

function BrandMark() {
  return <svg className="admin-brand-mark" width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="32" cy="32" r="29" /><path d="M19 55c14-14 16-28 18-45M32 35c-7-1-9-7-7-13 7 4 9 8 7 13ZM34 29c5-1 10-5 11-10-7 1-9 5-11 10ZM35 19c-4-4-3-8 3-12M29 41c-4 0-7-3-8-7" /></svg>;
}

function safeCsvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function ProductEditor({ product, existingImages, onSave, onClose }) {
  const [draft, setDraft] = useState(() => ({ ...defaultProduct, ...product }));
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const titleId = useId();
  const errorId = useId();
  const change = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const showDialog = (element) => {
    dialogRef.current = element;
    if (element && !element.open) element.showModal();
  };
  const closeEditor = () => {
    dialogRef.current?.close();
    onClose();
  };

  function submit(event) {
    event.preventDefault();
    const price = Number(draft.price);
    const stock = Number(draft.stock);
    const originalPrice = draft.originalPrice === '' ? price : Number(draft.originalPrice);
    if (!draft.name.trim()) return setError('请填写商品名称。');
    if (draft.price === '' || !Number.isFinite(price) || price < 0.01 || price > 1000000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) return setError('售价须为 0.01 至 1,000,000 元，最多保留两位小数。');
    if (!Number.isFinite(originalPrice) || originalPrice < price || originalPrice > 1000000 || Math.abs(originalPrice * 100 - Math.round(originalPrice * 100)) > 0.000001) return setError('划线价不能低于售价，最高 1,000,000 元且最多两位小数；不需要时可留空。');
    if (draft.stock === '' || !Number.isInteger(stock) || stock < 0 || stock > 1000000) return setError('库存须为 0 至 1,000,000 的整数。');
    if (!draft.image) return setError('请选择一张商品图片。');
    dialogRef.current?.close();
    onSave({ ...draft, name: draft.name.trim(), subtitle: draft.subtitle.trim(), price: Math.round(price * 100) / 100, originalPrice: Math.round(originalPrice * 100) / 100, stock, material: draft.material.trim(), tone: draft.tone.trim() });
  }

  return <dialog className="admin-dialog" ref={showDialog} onCancel={(event) => { event.preventDefault(); closeEditor(); }} onClick={(event) => { if (event.target === dialogRef.current) closeEditor(); }} aria-labelledby={titleId}>
    <form onSubmit={submit} noValidate>
      <div className="admin-dialog-head"><div><p className="admin-form-caption">MORROW / 商品档案</p><h2 id={titleId}>{product?.id ? '编辑商品' : '新增商品'}</h2></div><button className="admin-icon-button" type="button" onClick={closeEditor} aria-label="关闭商品编辑"><AdminIcon name="close" /></button></div>
      <div className="admin-edit-grid">
        <label className="admin-field admin-span-two">商品名称 <span>*</span><input autoFocus value={draft.name} onChange={change('name')} maxLength={60} placeholder="如：晨雾 · 陶瓷马克杯" required /></label>
        <label className="admin-field admin-span-two">一句话介绍<input value={draft.subtitle} onChange={change('subtitle')} maxLength={100} placeholder="用一句话，表达这件好物的特别之处。" /></label>
        <label className="admin-field">商品分类<select value={draft.category} onChange={change('category')}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="admin-field">商品状态<select value={draft.status} onChange={change('status')}><option value="active">销售中</option><option value="draft">已下架</option></select></label>
        <label className="admin-field">售价 / 元 <span>*</span><input type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={draft.price} onChange={change('price')} placeholder="128.00" required /></label>
        <label className="admin-field">划线价 / 元<input type="number" inputMode="decimal" min="0" step="0.01" value={draft.originalPrice} onChange={change('originalPrice')} placeholder="选填，不低于售价" /></label>
        <label className="admin-field">库存 / 件 <span>*</span><input type="number" inputMode="numeric" min="0" max="1000000" step="1" value={draft.stock} onChange={change('stock')} placeholder="36" required /></label>
        <label className="admin-field">材质<input value={draft.material} onChange={change('material')} maxLength={60} placeholder="如：高温陶瓷" /></label>
        <label className="admin-field admin-span-two">颜色 / 款式<input value={draft.tone} onChange={change('tone')} maxLength={60} placeholder="如：奶油白" /></label>
        <fieldset className="admin-image-field admin-span-two"><legend>商品图片 <span>*</span></legend><p>选择作品内已准备好的商品摄影。</p><div className="admin-image-options">{existingImages.map((item) => <button key={item.image} type="button" className={draft.image === item.image ? 'is-selected' : ''} onClick={() => setDraft((current) => ({ ...current, image: item.image }))} aria-label={`选择图片：${item.name}`} aria-pressed={draft.image === item.image}><img src={item.image} alt={item.name} loading="lazy" />{draft.image === item.image ? <span><AdminIcon name="check" size={13} /></span> : null}</button>)}</div></fieldset>
      </div>
      {error ? <p id={errorId} className="admin-error" role="alert">{error}</p> : null}
      <div className="admin-dialog-footer"><span>保存后同步至商城，本地自动保存。</span><button className="admin-button admin-button-secondary" type="button" onClick={closeEditor}>取消</button><button className="admin-button" type="submit" aria-describedby={error ? errorId : undefined}>保存商品</button></div>
    </form>
  </dialog>;
}

function CampaignEditor({ campaign, setCampaign, notify, onNavigate }) {
  const [draft, setDraft] = useState(() => ({ ...campaign }));
  const [error, setError] = useState('');
  function save(event) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.subtitle.trim()) return setError('请填写活动标题和介绍，再保存。');
    setCampaign({ ...draft, title: draft.title.trim(), subtitle: draft.subtitle.trim() });
    setError('');
    notify?.('首页内容已保存，商城已同步更新');
  }
  return <div className="admin-campaign-panel"><form className="admin-campaign-form" onSubmit={save}><h2>首页活动</h2><p className="admin-section-intro">让活动文案和品牌语气保持一致。</p><label className="admin-field">活动标题<textarea value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={40} rows={2} /></label><label className="admin-field">活动介绍<textarea value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} maxLength={140} rows={4} /></label><label className="admin-check-field"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span>在商城显示首页活动</span></label>{error ? <p role="alert" className="admin-error">{error}</p> : null}<div className="admin-campaign-actions"><button className="admin-button" type="submit">保存首页内容</button><button className="admin-text-button" type="button" onClick={() => onNavigate('shop')}>查看商城 <span aria-hidden="true">↗</span></button></div></form><div className="admin-campaign-preview"><span className="admin-preview-label">文案预览</span><div className="admin-preview-copy"><span className="admin-preview-brand">MORROW</span><h3>{draft.title || '活动标题'}</h3><p>{draft.subtitle || '活动介绍'}</p><span className="admin-preview-link">发现日常好物 <span aria-hidden="true">↗</span></span></div><p className="admin-preview-note">{draft.enabled ? '活动已开启 · 保存后应用到商城' : '活动已关闭 · 保存后在商城隐藏'}</p></div></div>;
}

function OrdersTable({ orders, onNavigate }) {
  if (!orders.length) return <div className="admin-empty admin-orders-empty"><AdminIcon name="list" size={32} /><h2>等待第一笔日常订单</h2><p>在商城完成一次演示下单后，订单会自动出现在这里。</p><button className="admin-button" type="button" onClick={() => onNavigate('shop')}>去商城体验</button><small>作品演示流程，不收款、不发货。</small></div>;
  return <div className="admin-table-panel"><div className="admin-table-scroll" tabIndex={0} aria-label="订单记录表格，可横向滚动"><table className="admin-table admin-order-table"><thead><tr><th>订单编号</th><th>商品明细</th><th>订单金额</th><th>创建时间</th><th>状态</th></tr></thead><tbody>{orders.map((order, index) => <tr key={order.id || index}><td><strong>{order.id || `DEMO-${index + 1}`}</strong></td><td>{Array.isArray(order.items) ? order.items.map((item) => `${item.name || item.product?.name || '商品'} × ${item.quantity || item.qty || 1}`).join('、') : '演示商品订单'}</td><td>{money(order.total ?? order.amount)}</td><td>{order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN', { hour12: false }) : '—'}</td><td><span className="admin-status">演示完成</span></td></tr>)}</tbody></table></div><div className="admin-table-footer"><span>共 {orders.length} 笔演示订单</span><span>不产生真实支付与物流</span></div></div>;
}

export default function Admin({ products, setProducts, campaign, setCampaign, orders = [], onNavigate, notify }) {
  const [section, setSection] = useState('products');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [editor, setEditor] = useState(null);
  const [page, setPage] = useState(1);
  const active = products.filter((product) => product.status === 'active').length;
  const lowStock = products.filter((product) => product.stock < 10 && product.status === 'active').length;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = products.filter((product) => (category === 'all' || product.category === category) && (status === 'all' || product.status === status) && `${product.name} ${product.subtitle} ${product.id} ${product.category}`.toLocaleLowerCase().includes(normalizedQuery));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const visiblePage = Math.min(page, pageCount);
  const visibleProducts = filtered.slice((visiblePage - 1) * 6, visiblePage * 6);
  const title = { products: '商品管理', campaign: '首页内容', orders: '订单记录' }[section];
  const intros = { products: '让每一件好物，都有清楚的表达。', campaign: '为日常更新一份恰到好处的邀请。', orders: '让购物体验，在每一个环节完整发生。' };
  const imageMap = new Map(products.filter((product) => product.image).map((product) => [product.image, product]));

  function saveProduct(product) {
    const saved = { ...product, id: product.id || `MW-${Date.now().toString(36).toUpperCase()}` };
    setProducts((current) => product.id ? current.map((item) => item.id === product.id ? saved : item) : [...current, saved]);
    setEditor(null);
    notify?.(product.id ? '商品已更新，商城已同步' : '商品已创建');
  }

  function toggleProduct(product) {
    const nextStatus = product.status === 'active' ? 'draft' : 'active';
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, status: nextStatus } : item));
    notify?.(`${product.name}已${nextStatus === 'active' ? '上架' : '下架'}`);
  }

  function exportCsv() {
    const rows = [['商品编号', '商品名称', '介绍', '分类', '售价', '划线价', '库存', '状态', '材质', '颜色'], ...filtered.map((product) => [product.id, product.name, product.subtitle, product.category, product.price, product.originalPrice, product.stock, product.status === 'active' ? '销售中' : '已下架', product.material, product.tone])];
    const blob = new Blob(['\uFEFF', rows.map((row) => row.map(safeCsvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MORROW-商品目录-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify?.(`已导出 ${filtered.length} 件商品`);
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar"><button className="admin-brand" type="button" onClick={() => onNavigate('shop')} aria-label="MORROW 返回商城"><BrandMark /><span>MORROW</span><small>日 常 之 间</small></button><nav className="admin-nav" aria-label="工作台导航">{[['products', 'tag', '商品管理'], ['campaign', 'home', '首页内容'], ['orders', 'list', '订单记录']].map(([value, icon, label]) => <button key={value} type="button" onClick={() => setSection(value)} className={section === value ? 'is-active' : ''} aria-current={section === value ? 'page' : undefined}><AdminIcon name={icon} /><span>{label}</span></button>)}</nav><div className="admin-sidebar-bottom"><button type="button" onClick={() => onNavigate('shop')}><AdminIcon name="arrow" /><span>返回商城</span></button><p><i />本地演示 · 自动保存</p></div></aside>
    <main className="admin-main" id="main-content"><div className="admin-topbar"><span>工作台 <b>/</b> {title}</span><span className="admin-studio">MORROW STUDIO</span></div><div className="admin-content"><div className="admin-page-heading"><div><h1>{title}</h1><p>{intros[section]}</p></div>{section === 'products' ? <button className="admin-button" type="button" onClick={() => setEditor({ ...defaultProduct, image: products[0]?.image || '' })}><AdminIcon name="plus" />新增商品</button> : null}</div>
      <div className="admin-metrics" aria-label="商城数据概览">{[['商品总数', products.length], ['正在销售', active], ['库存不足', lowStock], ['演示订单', orders.length]].map(([label, value]) => <div key={label}><span>{label}</span><strong className={label === '库存不足' && value > 0 ? 'admin-attention' : ''}>{value}</strong></div>)}</div>
      {section === 'products' ? <><section className="admin-table-panel" aria-label="商品列表"><div className="admin-toolbar"><label className="admin-search"><AdminIcon name="search" /><input aria-label="搜索商品" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="搜索商品名称或分类…" /></label><select className="admin-filter" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} aria-label="筛选分类"><option value="all">筛选分类</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select className="admin-status-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="筛选状态"><option value="all">全部状态</option><option value="active">销售中</option><option value="draft">已下架</option></select><button className="admin-button admin-button-secondary admin-export" type="button" onClick={exportCsv}><AdminIcon name="download" />导出 CSV</button></div><div className="admin-table-scroll" tabIndex={0} aria-label="商品数据表格，可横向滚动"><table className="admin-table"><thead><tr><th>商品信息</th><th>分类</th><th>售价</th><th>库存</th><th>状态</th><th>操作</th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.image} alt="" loading="lazy" /><div><strong>{product.name}</strong><span>ID: {product.id} <i>｜</i> {product.subtitle}</span></div></div></td><td>{product.category}</td><td className="admin-price">{money(product.price)}</td><td><span className={product.stock < 10 ? 'admin-stock-low' : ''}>{product.stock}</span></td><td><span className={`admin-status ${product.status === 'draft' ? 'is-draft' : ''}`}><i />{product.status === 'active' ? '销售中' : '已下架'}</span></td><td><div className="admin-row-actions"><button type="button" onClick={() => setEditor(product)} aria-label={`编辑${product.name}`}>编辑</button><button type="button" className="admin-shelf-button" onClick={() => toggleProduct(product)} aria-label={`${product.status === 'active' ? '下架' : '上架'}${product.name}`}>{product.status === 'active' ? '下架' : '上架'}</button></div></td></tr>)}</tbody></table>{!filtered.length ? <div className="admin-empty"><AdminIcon name="search" size={28} /><h2>没有找到相关商品</h2><p>试试其他关键词，或清除当前筛选。</p><button type="button" className="admin-text-button" onClick={() => { setQuery(''); setCategory('all'); setStatus('all'); setPage(1); }}>清除筛选</button></div> : null}</div><div className="admin-table-footer"><span>共 {filtered.length} 条商品{filtered.length !== products.length ? ` / 全部 ${products.length} 条` : ''}</span><div className="admin-pagination"><button type="button" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)} aria-label="上一页">‹</button><span aria-label={`第 ${visiblePage} 页，共 ${pageCount} 页`}>{visiblePage}</span><button type="button" disabled={visiblePage === pageCount} onClick={() => setPage(visiblePage + 1)} aria-label="下一页">›</button></div></div></section><div className="admin-footnote"><AdminIcon name="info" /><span>商品信息修改后，将同步显示在商城。库存不足提示：少于 10 件。</span></div></> : section === 'campaign' ? <CampaignEditor campaign={campaign} setCampaign={setCampaign} notify={notify} onNavigate={onNavigate} /> : <OrdersTable orders={orders} onNavigate={onNavigate} />}
      <p className="admin-local-note">当前为作品演示，数据保存在此浏览器。清除浏览器数据将恢复初始内容。</p>
    </div></main>{editor ? <ProductEditor product={editor} existingImages={[...imageMap.values()]} onSave={saveProduct} onClose={() => setEditor(null)} /> : null}
  </div>;
}
