/* ==========================================================================
   LUXE EN VOGUE — Site Script
   Handles: mobile nav, header state, reveal-on-scroll, cart (localStorage),
   shop filters/sort, FAQ accordion, contact + newsletter forms, toasts.
   ========================================================================== */

/* ---------------- Product catalogue (shared by home + shop) ---------------- */
const PRODUCTS = [
  { id:'p1',  name:'Aurelia Tailored Blazer',  cat:'Outerwear', price:128000, was:null,   tag:'New',  icon:'blazer', image: "images/Two-piece.jpg" },
  { id:'p2',  name:'Mireille Silk Slip Dress', cat:'Shorts',   price:96000,  was:124000, tag:'Sale', icon:'dress', image: "images/Knicker.jpg" },
  { id:'p3',  name:'Verlaine Wide-Leg Trouser',cat:'Trousers',  price:74000,  was:null,   tag:null,   icon:'trouser', image: "images/Baggy-2.jpg" },
  { id:'p4',  name:'Solène Cashmere Knit',     cat:'Knitwear',  price:88000,  was:null,   tag:'New',  icon:'knit', image: "images/Sweatshirt.jpg" },
  { id:'p5',  name:'Théodore Structured Coat', cat:'Outerwear', price:165000, was:null,   tag:null,   icon:'coat', image: "images/Two-piece-set.jpg" },
  { id:'p6',  name:'Anouk Denim Jacket', cat:'Jackets',   price:62000,  was:79000,  tag:'Sale', icon:'jacket', image: "images/Jean-Jacket.jpg" },
  { id:'p7',  name:'Soren Denim Jacket', cat:'Jackets', price:94000, was:108000, tag:'Sale', icon:'jacket', image: "images/Jacket.jpg" },
  { id:'p8',  name:'Black Essential Hoody',   cat:'Jackets',      price:41000,  was:null,   tag:'New',  icon:'coat', image: "images/Hoody-2.jpg" },
  { id:'p9',  name:'Hadrien Wool Hoody',    cat:'Jackets', price:178000, was:198000, tag:'Sale', icon:'coat', image: "images/Hoody.jpg" },
  { id:'p10', name:'Isolde Ribbed Turtleneck', cat:'Knitwear',  price:58000,  was:null,   tag:null,   icon:'knit', image: "images/Sweatshirt-2.jpg" },
  { id:'p11', name:'Rosalind Tapered Denim',   cat:'Trousers',  price:69000,  was:null,   tag:'New',  icon:'trouser', image: "images/Baggy-3.jpg" },
  { id:'p12', name:'Summer Stripe Tee',    cat:'Tops',    price:49000,  was:null,   tag:null,   icon:'shirt', image: "images/Tshirt.jpg" },
  { id:'p13', name:'DG Quality Shirt',    cat:'Tops',    price:49000,  was:null,   tag:null,   icon:'shirt', image: "images/Top-2.jpg" },
  { id:'p14', name:'STRNG Shirt',    cat:'Tops',    price:49000,  was:null,   tag:null,   icon:'shirt', image: "images/Top-3.jpg" },
  { id:'p15', name:'Supreme Renew Top',    cat:'Tops',    price:49000,  was:null,   tag:null,   icon:'shirt', image: "images/Top-4.jpg" },
  { id:'p16', name:'Lucien Double-Breasted Coat', cat:'Outerwear', price:185000, was:210000, tag:'Sale', icon:'coat', image: "images/Twopiece-3.jpg" },
  { id:'p17', name:'Riley Jersey Dress', cat:'Jersey', price:68000, was:null, tag:'New', icon:'skirt', image: "images/jersey.jpg" },
  { id:'p18', name:'Milo Stretch Chinos', cat:'Trousers', price:52000, was:null, tag:null, icon:'trouser', image: "images/Baggy-Jean.jpg" },
  { id:'p19', name:'Harper Jersey Shirt', cat:'Jersey', price:45000, was:null, tag:'New', icon:'shirt', image: "images/jersey-2.jpg" },
  { id:'p20', name:'Avery Jersey Tank', cat:'Jersey', price:32000, was:null, tag:null, icon:'cami', image: "images/jersey-3.jpg" },
  { id:'p21', name:'Celine Wool Cardigan', cat:'Knitwear', price:98000, was:null, tag:'New', icon:'knit', image: "images/Sweatshirt-3.jpg" },
  { id:'p22', name:'Noah Signature Jacket', cat:'Trousers', price:210000, was:238000, tag:'Sale', icon:'jacket', image: "images/Baggy.jpg" },
  { id:'p23', name:'Avery Pleated Shorts', cat:'Shorts', price:36000, was:null, tag:null, icon:'shirt', image: "images/Knicker-2.jpg" },
  { id:'p24', name:'Fleur Seersucker Shirt', cat:'Shirts', price:47000, was:null, tag:'New', icon:'shirt', image: "images/Top-Shirt.jpg" },
  { id:'p25', name:'Theo Jersey Top', cat:'Jersey', price:54000, was:62000, tag:'Sale', icon:'shirt', image: "images/jersey-4.jpg" },
  { id:'p26', name:'Marin Tailored Vest', cat:'Outerwear', price:72000, was:null, tag:null, icon:'blazer', image: "images/Twopiece-4.jpg" },
  { id:'p27', name:'Lena Linen Pants', cat:'Trousers', price:46000, was:null, tag:'New', icon:'trouser', image: "images/Pant-Trousers.jpg" },
  { id:'p28', name:'Rory Cable Knit Jumper', cat:'Knitwear', price:82000, was:null, tag:null, icon:'knit', image: "images/Sweatshirt-4.jpg" },
  { id:'p29', name:'Juno Draped Blouse', cat:'Shirts', price:43000, was:null, tag:null, icon:'shirt', image: "images/Top-Shirt-2.jpg" },
  { id:'p30', name:'Soren Denim Jacket', cat:'Shorts', price:94000, was:108000, tag:'Sale', icon:'jacket', image: "images/Knicker-3.jpg" },
  { id:'p31', name:'Noelle Silk Cami', cat:'Shirts', price:39000, was:null, tag:'New', icon:'cami', image: "images/Top-Shirt-3.jpg" },
  { id:'p32', name:'Rene Wide-Leg Shorts', cat:'Shorts', price:42000, was:null, tag:null, icon:'shirt', image: "images/Knicker-4.jpg" },
  { id:'p33', name:'Clara Mock-Neck Knit', cat:'Knitwear', price:64000, was:null, tag:'New', icon:'knit', image: "images/Sweatshirt-5.jpg" },
  { id:'p34', name:'Nina Cargo Trousers', cat:'Shorts', price:56000, was:null, tag:null, icon:'trouser', image: "images/Knicker-5.jpg" },
  { id:'p35', name:'Luca Stretch Shirt', cat:'Tops', price:51000, was:null, tag:'New', icon:'shirt', image: "images/Top.jpg" },
  { id:'p36', name:'Arielle Boxy Tee', cat:'Outerwear', price:35000, was:null, tag:'New', icon:'shirt', image: "images/Twopiece-5.jpg" },
  { id:'p37', name:'Mika Tailored Two-piece', cat:'Outerwear', price:125000, was:null, tag:null, icon:'blazer', image: "images/Twopiece-2.jpg" },
  { id:'p38', name:'Ezra Relaxed Trousers', cat:'Outerwear', price:62000, was:null, tag:'New', icon:'trouser', image: "images/Twopiece-6.jpg" },
];

function nairaFormat(n){
  return '₦' + n.toLocaleString('en-NG');
}

/* ---------------- Merge in WhatsApp-approved products ----------------
   These are products added via WhatsApp and approved in admin.html. The
   38 products above are untouched — this just appends to the same array
   once the fetch resolves. Other scripts (track-order.js) and script.js's
   own init await `window.__productsReady` before reading PRODUCTS, so
   nothing races ahead of this. If the fetch fails, the static catalogue
   above still works exactly as before. */
window.__productsReady = (async function loadExtraProducts(){
  try{
    const res = await fetch('/api/products');
    if(!res.ok) return;
    const data = await res.json();
    if(Array.isArray(data.products)){
      data.products.forEach(p => PRODUCTS.push(p));
    }
  }catch(e){
    // Network hiccup or endpoint not deployed yet — fail soft.
  }
})();

/* ---------------- Garment line-art icons (inline SVG strings) ---------------- */
const ICONS = {
  blazer:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M60 10 L40 26 L20 22 L8 50 L22 58 L26 130 H94 L98 58 L112 50 L100 22 L80 26 Z"/><path d="M60 10 L60 50 M44 26 L60 50 L76 26" /><circle cx="60" cy="74" r="2.2" fill="#1E3F66"/><circle cx="60" cy="92" r="2.2" fill="#1E3F66"/></svg>`,
  dress:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M60 10 L46 26 L40 40 L30 130 H90 L80 40 L74 26 Z"/><path d="M46 26 L60 40 L74 26 M40 40 L60 56 L80 40"/></svg>`,
  trouser:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M34 12 H86 L90 130 H66 L60 60 L54 130 H30 Z"/><path d="M34 30 H86"/></svg>`,
  knit:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M60 10 L36 22 L14 36 L26 56 L38 48 L34 130 H86 L82 48 L94 56 L106 36 L84 22 Z"/><path d="M48 22 Q60 36 72 22" /></svg>`,
  coat:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M60 8 L38 24 L16 20 L6 52 L20 60 L24 132 H96 L100 60 L114 52 L104 20 L82 24 Z"/><path d="M60 8 L60 132 M60 30 L40 50 M60 30 L80 50"/></svg>`,
  skirt:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M42 14 H78 L98 130 H22 Z"/><path d="M42 14 H78 M50 14 L34 130 M58 14 L48 130 M70 14 L86 130"/></svg>`,
  shirt:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M60 8 L42 20 L18 16 L8 40 L22 48 L26 130 H94 L98 48 L112 40 L102 16 L78 20 Z"/><path d="M60 8 L52 30 L60 40 L68 30 Z"/><path d="M60 40 L60 130"/></svg>`,
  cami:`<svg viewBox="0 0 120 140" fill="none" stroke="#1E3F66" stroke-width="2"><path d="M44 14 L36 30 L42 34 L48 22 L48 130 H72 L72 22 L78 34 L84 30 L76 14 Z"/></svg>`,
};

/* ---------------- Cart (persisted in localStorage) ---------------- */
const Cart = {
  KEY: 'lev_cart_v1',
  read(){
    try{
      const raw = localStorage.getItem(this.KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      // Guard against corrupt data — must be an array
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){
      // Clear corrupt storage so it doesn't persist
      localStorage.removeItem(this.KEY);
      return [];
    }
  },
  write(items){ localStorage.setItem(this.KEY, JSON.stringify(items)); Cart.render(); },
  add(id){
    const items = Cart.read();
    const found = items.find(i => i.id === id);
    if(found){ found.qty += 1; } else { items.push({ id, qty:1 }); }
    Cart.write(items);
    const p = PRODUCTS.find(p => p.id === id);
    showToast(p ? `${p.name} added to bag` : 'Added to bag');
    openCart();
  },
  remove(id){
    Cart.write(Cart.read().filter(i => i.id !== id));
  },
  setQty(id, qty){
    const items = Cart.read();
    const found = items.find(i => i.id === id);
    if(found){ found.qty = Math.max(1, qty); }
    Cart.write(items);
  },
  count(){ return Cart.read().reduce((s,i)=>s+i.qty,0); },
  total(){
    return Cart.read().reduce((s,i)=>{
      const p = PRODUCTS.find(p=>p.id===i.id);
      return s + (p ? p.price * i.qty : 0);
    },0);
  },
  render(){
    const countEls = document.querySelectorAll('[data-cart-count]');
    countEls.forEach(el => el.textContent = Cart.count());

    const list = document.querySelector('[data-cart-items]');
    const foot = document.querySelector('[data-cart-foot]');
    if(!list) return;
    const items = Cart.read();
    if(items.length === 0){
      list.innerHTML = `<div class="cart-empty"><p>Your bag is empty.</p><p style="margin-top:8px;font-size:.85rem;">Browse the collection and add something beautiful.</p></div>`;
      if(foot) foot.style.display = 'none';
      return;
    }
    if(foot) foot.style.display = 'block';
    list.innerHTML = items.map(i => {
      const p = PRODUCTS.find(p => p.id === i.id);
      if(!p) return '';
      return `
      <div class="cart-row">
        <div class="ci-thumb">${ICONS[p.icon] || ''}</div>
        <div style="flex:1">
          <div class="ci-name">${p.name}</div>
          <div class="ci-meta">${p.cat} · ${nairaFormat(p.price)}</div>
          <div class="qty">
            <button data-qty-down="${p.id}" aria-label="Decrease quantity">−</button>
            <span>${i.qty}</span>
            <button data-qty-up="${p.id}" aria-label="Increase quantity">+</button>
          </div>
          <span class="ci-remove" data-remove="${p.id}">Remove</span>
        </div>
      </div>`;
    }).join('');

    const totalEl = document.querySelector('[data-cart-total]');
    if(totalEl) totalEl.textContent = nairaFormat(Cart.total());

    list.querySelectorAll('[data-qty-up]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.qtyUp;
      const item = Cart.read().find(i=>i.id===id);
      Cart.setQty(id, (item?.qty||1)+1);
    }));
    list.querySelectorAll('[data-qty-down]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.qtyDown;
      const item = Cart.read().find(i=>i.id===id);
      if(item && item.qty <= 1){ Cart.remove(id); } else { Cart.setQty(id, (item?.qty||1)-1); }
    }));
    list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => Cart.remove(b.dataset.remove)));
  }
};

function openCart(){
  document.querySelector('[data-cart-drawer]')?.classList.add('is-open');
  document.querySelector('[data-overlay]')?.classList.add('is-open');
}
function closeCart(){
  document.querySelector('[data-cart-drawer]')?.classList.remove('is-open');
  document.querySelector('[data-overlay]')?.classList.remove('is-open');
}

/* ---------------- Toast ---------------- */
let toastTimer;
function showToast(msg){
  const t = document.querySelector('[data-toast]');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2400);
}

/* ---------------- Product card render (used on home + shop) ---------------- */
function renderProductCard(p){
  const tagHtml = p.tag ? `<span class="product-tag ${p.tag==='Sale'?'sale':''}">${p.tag}</span>` : '';
  const priceHtml = p.was
    ? `<span class="price"><span class="was">${nairaFormat(p.was)}</span>${nairaFormat(p.price)}</span>`
    : `<span class="price">${nairaFormat(p.price)}</span>`;
  return `
  <div class="product-card reveal" data-cat="${p.cat}">
    <div class="product-thumb">
      ${tagHtml}
      ${p.image ? `<img src="${p.image}" alt="${p.name}" class="product-image" />` : (ICONS[p.icon] || '')}
      <button class="product-quick" data-add="${p.id}" aria-label="Add ${p.name} to bag" title="Add to bag">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B1F3A" stroke-width="2"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 4 2H2"/><circle cx="9" cy="20" r="1.4" fill="#0B1F3A"/><circle cx="18" cy="20" r="1.4" fill="#0B1F3A"/></svg>
      </button>
    </div>
    <div class="product-info">
      <span class="pname">${p.name}</span>
      <span class="pcat">${p.cat}</span>
      <div class="pfoot">
        ${priceHtml}
        <span class="stars">★★★★★</span>
      </div>
    </div>
  </div>`;
}

function wireAddButtons(scope=document){
  scope.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Cart.add(btn.dataset.add);
    });
  });
}

/* ---------------- Reveal on scroll (single shared observer instance) ---------------- */
let revealObserver = null;

function initReveal(){
  // Collect only elements that haven't been observed yet
  const els = document.querySelectorAll('.reveal:not([data-observed])');
  if(!els.length) return;

  if(!('IntersectionObserver' in window)){
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  if(!revealObserver){
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
  }

  els.forEach(el => {
    el.setAttribute('data-observed', '1');
    revealObserver.observe(el);
  });
}

/* ---------------- Mobile nav ---------------- */
function initMobileNav(){
  const burger = document.querySelector('[data-burger]');
  const mnav = document.querySelector('[data-mobile-nav]');
  const close = document.querySelector('[data-mobile-close]');
  const overlay = document.querySelector('[data-overlay]');
  burger?.addEventListener('click', () => { mnav?.classList.add('is-open'); overlay?.classList.add('is-open'); });
  close?.addEventListener('click', () => { mnav?.classList.remove('is-open'); overlay?.classList.remove('is-open'); });
  overlay?.addEventListener('click', () => { mnav?.classList.remove('is-open'); closeCart(); });
}

/* ---------------- Cart drawer wiring ---------------- */
function initCartDrawer(){
  document.querySelectorAll('[data-cart-open]').forEach(b => b.addEventListener('click', (e)=>{ e.preventDefault(); openCart(); }));
  document.querySelector('[data-cart-close]')?.addEventListener('click', closeCart);
}

/* ---------------- FAQ accordion ---------------- */
function initFaq(){
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if(!q || !a) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o => {
        o.classList.remove('open');
        const oa = o.querySelector('.faq-a');
        if(oa) oa.style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });
}

/* ---------------- Newsletter + contact forms ---------------- */
function initForms(){
  // Newsletter — can be on multiple pages
  document.querySelectorAll('[data-newsletter]').forEach(news => {
    news.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = news.querySelector('input[type="email"]');
      if(input && input.value.trim()){
        showToast('You\u2019re on the list — welcome to Luxe En Vogue');
        news.reset();
      }
    });
  });

  // Contact form
  const contact = document.querySelector('[data-contact-form]');
  if(contact){
    const submitBtn = contact.querySelector('button[type="submit"]');
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      // Disable button during "submission" to prevent double-submit
      if(submitBtn){
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      // Simulate async submission
      setTimeout(() => {
        const note = document.querySelector('[data-form-note]');
        if(note){
          note.textContent = 'Message sent — our styling team will reply within 1 business day.';
          note.style.color = 'var(--azure)';
        }
        contact.reset();
        if(submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send message';
        }
      }, 600);
    });
  }
}

/* ---------------- Shop filter + sort ---------------- */
function initShop(){
  const grid = document.querySelector('[data-product-grid]');
  if(!grid) return;

  const chips = document.querySelectorAll('[data-filter]');
  const sortSelect = document.querySelector('[data-sort]');
  const countLabel = document.querySelector('[data-result-count]');

  function apply(){
    const active = document.querySelector('[data-filter].is-active')?.dataset.filter || 'All';
    let list = active === 'All' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === active);
    const sortVal = sortSelect?.value;
    if(sortVal === 'low') list.sort((a,b)=>a.price-b.price);
    if(sortVal === 'high') list.sort((a,b)=>b.price-a.price);
    if(sortVal === 'new') list = list.filter(p=>p.tag==='New').concat(list.filter(p=>p.tag!=='New'));
    grid.innerHTML = list.map(renderProductCard).join('');
    wireAddButtons(grid);
    // Observe newly rendered cards — initReveal handles de-duplication
    initReveal();
    if(countLabel) countLabel.textContent = `${list.length} piece${list.length===1?'':'s'}`;
  }

  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    apply();
  }));
  sortSelect?.addEventListener('change', apply);
  apply();
}

/* ---------------- Featured products on home ---------------- */
function initFeatured(){
  const grid = document.querySelector('[data-featured-grid]');
  if(!grid) return;
  const featured = PRODUCTS.slice(0, 4);
  grid.innerHTML = featured.map(renderProductCard).join('');
  wireAddButtons(grid);
  initReveal();
}

/* ---------------- Scroll to top / bottom toggle ---------------- */
function initScrollToggle(){
  const btn = document.querySelector('[data-scroll-toggle]');
  if(!btn) return;

  const SHOW_AFTER = 240; // px scrolled before the button appears

  function nearBottom(){
    const scrollBottom = window.scrollY + window.innerHeight;
    return scrollBottom >= document.documentElement.scrollHeight - 80;
  }

  function update(){
    const y = window.scrollY;
    btn.classList.toggle('is-visible', y > SHOW_AFTER || nearBottom());

    if(nearBottom()){
      btn.classList.add('at-bottom');
      btn.setAttribute('aria-label', 'Scroll to top');
    } else {
      btn.classList.remove('at-bottom');
      btn.setAttribute('aria-label', 'Scroll to bottom');
    }
  }

  btn.addEventListener('click', () => {
    if(btn.classList.contains('at-bottom')){
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ---------------- Header scroll state ---------------- */
function initHeaderScroll(){
  const header = document.querySelector('[data-site-header]');
  if(!header) return;
  const onScroll = () => {
    header.style.boxShadow = window.scrollY > 8 ? '0 8px 24px -16px rgba(11,31,58,0.3)' : 'none';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.__productsReady;
  Cart.render();
  initMobileNav();
  initCartDrawer();
  initFaq();
  initForms();
  initShop();    // calls initReveal() internally for shop cards
  initFeatured(); // calls initReveal() internally for featured cards
  initReveal();  // picks up all remaining static .reveal elements
  initHeaderScroll();
  initScrollToggle();
});