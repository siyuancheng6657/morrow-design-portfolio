import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import Shop from './pages/Shop.jsx';
import Admin from './pages/Admin.jsx';
import Portfolio from './pages/Portfolio.jsx';
import { ProductDetail, Cart, Checkout, OrderSuccess } from './components/Commerce.jsx';
import { initialProducts, initialCampaign } from './data.js';
import { useSavedState } from './storage.js';

const validProducts=v=>Array.isArray(v)&&v.length>0&&v.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.price)&&p.price>=0&&Number.isInteger(p.stock)&&p.stock>=0);
const validCart=v=>Array.isArray(v)&&v.every(c=>c&&typeof c.id==='string'&&Number.isInteger(c.quantity)&&c.quantity>0);
const currentPage=()=>['admin','portfolio'].includes(location.hash.slice(1))?location.hash.slice(1):'shop';
export default function App(){
  const [page,setPage]=useState(currentPage);
  const [products,setProducts]=useSavedState('products',initialProducts,validProducts);
  const [campaign,setCampaign]=useSavedState('campaign',initialCampaign,v=>v&&typeof v.title==='string'&&typeof v.subtitle==='string'&&typeof v.enabled==='boolean');
  const [cart,setCart]=useSavedState('cart',[],validCart);
  const [orders,setOrders]=useSavedState('orders',[]);
  const [modal,setModal]=useState(null);
  const [selected,setSelected]=useState(null);
  const [lastOrder,setLastOrder]=useState(null);
  const [toast,setToast]=useState('');
  const timer=useRef(null);
  useEffect(()=>{const listener=()=>{setPage(currentPage());setModal(null);window.scrollTo(0,0);};window.addEventListener('hashchange',listener);return()=>{window.removeEventListener('hashchange',listener);clearTimeout(timer.current);};},[]);
  const notify=message=>{setToast(String(message));clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),6500);};
  const navigate=next=>{location.hash=next==='shop'?'shop':next;setPage(next);setModal(null);window.scrollTo(0,0);};
  const add=(id,quantity=1)=>{const p=products.find(v=>v.id===id);const existing=cart.find(v=>v.id===id)?.quantity||0;if(!p||p.status!=='active'||p.stock<existing+quantity){notify('这件好物的库存不足，试着减少一点数量。');return false;}setCart(prev=>prev.some(v=>v.id===id)?prev.map(v=>v.id===id?{...v,quantity:v.quantity+quantity}:v):[...prev,{id,quantity}]);notify(`已将${quantity}件「${p.name}」加入购物袋`);return true;};
  const submitOrder=delivery=>{if(!delivery.name||delivery.address.length<6)return'请填写收件人和至少6个字的演示地址。';if(!cart.length)return'购物袋为空，请先选择商品。';const items=cart.map(c=>({...c,p:products.find(p=>p.id===c.id)}));if(items.some(c=>!c.p||c.p.status!=='active'||c.p.stock<c.quantity))return'部分商品已下架或库存有变化，请回购物袋调整。';const subtotal=items.reduce((n,c)=>n+Math.round(c.p.price*100)*c.quantity,0)/100;const shipping=subtotal>=199?0:12;const order={id:`MR${Date.now().toString(36).toUpperCase()}`,createdAt:new Date().toISOString(),status:'演示订单',items:items.map(c=>({id:c.id,name:c.p.name,price:c.p.price,quantity:c.quantity})),subtotal,shipping,total:subtotal+shipping,delivery};setProducts(prev=>prev.map(p=>({...p,stock:p.stock-(cart.find(c=>c.id===p.id)?.quantity||0)})));setOrders(prev=>[order,...prev]);setCart([]);setLastOrder(order);setModal('success');return'';};
  const selectedProduct=products.find(p=>p.id===selected);
  return <><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();const main=document.getElementById('main-content');main?.setAttribute('tabindex','-1');main?.focus();main?.scrollIntoView();}}>跳到主要内容</a>{page==='admin'?<Admin products={products} setProducts={setProducts} campaign={campaign} setCampaign={setCampaign} orders={orders} onNavigate={navigate} notify={notify}/>:page==='portfolio'?<Portfolio onNavigate={navigate}/>:<Shop products={products} campaign={campaign} cartCount={cart.reduce((n,c)=>n+c.quantity,0)} onCart={()=>setModal('cart')} onProduct={id=>{setSelected(id);setModal('product');}} onAdd={add} onNavigate={navigate} notify={notify}/>}
    {modal==='product'&&selectedProduct&&<ProductDetail key={selected} product={selectedProduct} onClose={()=>setModal(null)} onAdd={add}/>}
    {modal==='cart'&&<Cart cart={cart} products={products} setCart={setCart} onClose={()=>setModal(null)} onCheckout={()=>setModal('checkout')}/>}
    {modal==='checkout'&&<Checkout cart={cart} products={products} onClose={()=>setModal('cart')} onSubmit={submitOrder}/>}
    {modal==='success'&&lastOrder&&<OrderSuccess order={lastOrder} onClose={()=>setModal(null)}/>}
    {toast&&<div className="toast" role="status"><Check size={18}/><span>{toast}</span><button aria-label="关闭提示" onClick={()=>setToast('')}><X size={16}/></button></div>}
  </>;
}
