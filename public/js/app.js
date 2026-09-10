const WHATSAPP_NUMBER = "923051040666";
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem("beausionCart") || "[]");
const params = new URLSearchParams(location.search);
const categorySlug = params.get("category") || "";
const productId = params.get("id") || "";

function money(n){ return "Rs. " + Number(n || 0).toLocaleString("en-PK"); }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function waUrl(product="") { const msg = product ? `Hello Beausion.pk! I am interested in: ${product}. Please share price and availability.` : "Hello Beausion.pk! I would like to ask about your beauty products."; return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`; }
function setWhatsAppLinks(product=""){ document.querySelectorAll(".wa-head,#contactWhatsApp,.product-wa").forEach(el=>el.href=waUrl(product)); }

async function fetchCategories(){
  const res=await fetch("/api/categories");
  categories=res.ok?await res.json():[];
  return categories;
}
function renderCategories(){
  const el=document.getElementById("categoryGrid"); if(!el)return;
  el.innerHTML=categories.map(c=>`<a class="category-card" href="/category.html?category=${encodeURIComponent(c.slug)}"><div class="category-image"><img src="${esc(c.image||c.banner)}" alt="${esc(c.name)}"><span>Explore <i class="fa-solid fa-arrow-right"></i></span></div><div class="category-copy"><h3>${esc(c.name)}</h3><p>${esc(c.description||"Explore this collection.")}</p></div></a>`).join("") || `<div class="empty-state"><span>✦</span><h3>No categories yet</h3><p>Add your first collection from the admin panel.</p></div>`;
}
function findCategory(){ return categories.find(c=>c.slug===categorySlug || c.name===categorySlug); }

function renderHeroSlider(){
  const slides=document.getElementById("heroSlides"), dots=document.getElementById("heroDots");
  if(!slides || !categories.length)return;
  slides.innerHTML=categories.map((c,i)=>`<div class="hero-slide ${i===0?"active":""}" style="background-image:url('${esc(c.banner||c.image)}')"><div class="hero-slide-label"><span>${esc(c.name)}</span></div></div>`).join("");
  if(dots){dots.innerHTML=categories.map((_,i)=>`<button class="hero-dot ${i===0?"active":""}" onclick="setHeroSlide(${i})" aria-label="Slide ${i+1}"></button>`).join("");}
  window.heroIndex=0; clearInterval(window.heroTimer);
  if(categories.length>1)window.heroTimer=setInterval(()=>setHeroSlide((window.heroIndex+1)%categories.length),4500);
}
function setHeroSlide(i){
  const slides=[...document.querySelectorAll(".hero-slide")], dots=[...document.querySelectorAll(".hero-dot")]; if(!slides.length)return;
  window.heroIndex=i; slides.forEach((el,n)=>el.classList.toggle("active",n===i)); dots.forEach((el,n)=>el.classList.toggle("active",n===i));
}

async function loadProducts(){
  const search=document.getElementById("search")?.value || "";
  const c=findCategory();
  const category = c?.name || (categorySlug && categorySlug !== "All" ? categorySlug : "");
  const qs=new URLSearchParams(); if(category)qs.set("category",category); if(search)qs.set("search",search);
  const res=await fetch(`/api/products?${qs}`);
  if(!res.ok){renderProducts([], document.getElementById("products")||document.getElementById("featuredProducts"));return;}
  products=await res.json();
  const target=document.getElementById("products") || document.getElementById("featuredProducts");
  renderProducts(products,target);
}
function productCard(p){
  return `<article class="product-card reveal"><a class="product-img" href="/product.html?id=${encodeURIComponent(p._id)}">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:`<div class="placeholder">B</div>`}<span>${esc(p.category || "Beauty")}</span></a><div class="product-info"><div class="muted">${p.stock>0?"In stock":"Out of stock"}</div><h3><a href="/product.html?id=${encodeURIComponent(p._id)}">${esc(p.name)}</a></h3><p>${esc(p.description || "Beauty & personal-care essential.")}</p><div class="price">${money(p.price)} ${p.oldPrice?`<span class="old">${money(p.oldPrice)}</span>`:""}</div><div class="card-actions"><a class="action-icon view-btn" href="/product.html?id=${encodeURIComponent(p._id)}" title="View details"><i class="fa-solid fa-eye"></i><span>Details</span></a><button class="action-icon add" ${p.stock<1?"disabled":""} onclick="addToCart('${p._id}')" title="Add to bag"><i class="fa-solid fa-bag-shopping"></i><span>${p.stock<1?"Out of stock":"Bag"}</span></button><a class="action-icon product-wa" href="${waUrl(p.name)}" target="_blank" rel="noopener" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a></div></div></article>`;
}
function renderProducts(list,el){ if(!el)return; el.innerHTML=list.length?list.map(productCard).join(""):`<div class="empty-state"><span>✦</span><h3>No products here yet</h3><p>Products added from the Beausion admin panel will appear in this collection.</p></div>`; }
async function loadFeatured(){
  const el=document.getElementById("featuredProducts");
  if(!el)return;
  const res=await fetch("/api/products");
  if(!res.ok)return;
  const all=await res.json();

  if(!all.length){
    el.innerHTML=`<div class="empty-state"><span>✦</span><h3>No products here yet</h3><p>Products added from the Beausion admin panel will appear here.</p></div>`;
    return;
  }

  // Desktop: 3 columns x 3 rows visible. Slider moves ONE COLUMN at a time,
  // so every movement reveals the next 3 products vertically.
  const columnSize=3;
  const columns=[];
  for(let i=0;i<all.length;i+=columnSize){
    columns.push(all.slice(i,i+columnSize));
  }

  // Clone the first two columns for a seamless 3-column viewport loop.
  const displayColumns=columns.length>3
    ? columns.concat(columns.slice(0,2))
    : columns;

  el.className="featured-slider";
  el.innerHTML=`
    <button class="featured-arrow featured-prev" type="button" aria-label="Previous products">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <div class="featured-viewport">
      <div class="featured-track">
        ${displayColumns.map(col=>`<div class="featured-column">${col.map(productCard).join("")}</div>`).join("")}
      </div>
    </div>
    <button class="featured-arrow featured-next" type="button" aria-label="Next products">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
    ${columns.length>3?`<div class="featured-page-dots">${columns.map((_,i)=>`<button type="button" class="featured-page-dot${i===0?' active':''}" data-page="${i}" aria-label="Go to product column ${i+1}"></button>`).join("")}</div>`:""}
  `;

  const track=el.querySelector(".featured-track");
  const prev=el.querySelector(".featured-prev");
  const next=el.querySelector(".featured-next");
  const dots=[...el.querySelectorAll(".featured-page-dot")];
  let index=0;
  const maxIndex=Math.max(0,columns.length-1);
  let animating=false;

  function updateSlider(instant=false){
    track.style.transition=instant?"none":"transform .65s ease";
    track.style.transform=`translateX(-${index*(100/3)}%)`;
    dots.forEach((dot,i)=>dot.classList.toggle("active",i===index));
  }

  function moveNext(){
    if(columns.length<=3 || animating)return;
    animating=true;
    index++;
    updateSlider();
    // When the cloned columns are reached, jump invisibly back to the real first column.
    if(index===maxIndex){
      setTimeout(()=>{
        index=0;
        updateSlider(true);
        requestAnimationFrame(()=>{track.offsetHeight; track.style.transition="transform .65s ease";});
        animating=false;
      },680);
    }else{
      setTimeout(()=>animating=false,680);
    }
  }

  function movePrev(){
    if(columns.length<=3 || animating)return;
    animating=true;
    if(index===0){
      index=maxIndex;
      updateSlider(true);
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          index=maxIndex-1;
          updateSlider();
          setTimeout(()=>animating=false,680);
        });
      });
    }else{
      index--;
      updateSlider();
      setTimeout(()=>animating=false,680);
    }
  }

  prev.addEventListener("click",movePrev);
  next.addEventListener("click",moveNext);
  dots.forEach(dot=>dot.addEventListener("click",()=>{
    if(animating)return;
    index=Math.min(Number(dot.dataset.page)||0,maxIndex-1);
    updateSlider();
  }));

  let autoTimer=columns.length>3?setInterval(moveNext,4000):null;
  el.addEventListener("mouseenter",()=>{if(autoTimer)clearInterval(autoTimer);});
  el.addEventListener("mouseleave",()=>{
    if(columns.length>3){
      if(autoTimer)clearInterval(autoTimer);
      autoTimer=setInterval(moveNext,4000);
    }
  });

  updateSlider(true);
}
async function loadCategoryPage(){
  if(!document.getElementById("categoryTitle"))return;
  const c=findCategory();
  if(c){ document.title=`${c.name} — Beausion.pk`; document.getElementById("categoryTitle").textContent=c.name; document.getElementById("categoryHeading").textContent=c.name; document.getElementById("categoryDescription").textContent=c.description||"Browse products in this collection."; const hero=document.getElementById("categoryHero"); if(hero && c.banner)hero.style.backgroundImage=`linear-gradient(90deg,rgba(39,26,20,.78),rgba(39,26,20,.22)),url('${c.banner}')`; }
  else { document.getElementById("categoryTitle").textContent=categorySlug||"Collection"; }
  await loadProducts();
}

async function loadProductDetail(){
  const root=document.getElementById("productDetail"); if(!root)return;
  if(!productId){root.innerHTML=`<div class="empty-state"><h3>Product not found</h3></div>`;return;}
  const res=await fetch(`/api/products/${encodeURIComponent(productId)}`); if(!res.ok){root.innerHTML=`<div class="empty-state"><h3>Product not found</h3><p>This product may have been removed.</p></div>`;return;}
  const p=await res.json(); products=[p]; const imgs=[p.image,...(p.images||[])].filter(Boolean); const gallery=imgs.length?imgs:[""]; const discount=p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
  document.title=`${p.name} — Beausion.pk`; setWhatsAppLinks(p.name);
  const variants=(p.variants&&p.variants.length?p.variants:((p.sizes||[]).filter(x=>x&&x!=="Standard").length?[{label:"Size",values:p.sizes.filter(x=>x&&x!=="Standard")}]:[]));
  root.innerHTML=`<div class="product-detail-grid"><div class="detail-gallery"><div class="detail-main"><img id="detailMainImage" src="${esc(gallery[0])}" alt="${esc(p.name)}"></div><div class="detail-thumbs">${gallery.map((src,i)=>`<button onclick="setDetailImage('${esc(src)}')" class="${i===0?"active":""}"><img src="${esc(src)}" alt=""></button>`).join("")}</div></div><div class="detail-info"><div class="detail-category">${esc(p.category||"Beauty")}</div><h1>${esc(p.name)}</h1><div class="detail-rating">★★★★★ <span>Premium collection</span></div><div class="detail-price">${money(p.price)} ${p.oldPrice?`<span class="old">${money(p.oldPrice)}</span>`:""} ${discount?`<b>${discount}% OFF</b>`:""}</div><div class="delivery-box"><b>🚚 Delivery</b><span>Cash on Delivery available across Pakistan</span><span>Estimated delivery 2–5 working days</span></div><div class="variant-area">${variants.map((v,gi)=>`<div class="variant-group"><div class="variant-label">${esc(v.label)}:</div><div class="variant-options">${(v.values||[]).map((val,vi)=>`<button type="button" class="variant-option ${vi===0?"selected":""}" data-group="${gi}" data-value="${esc(val)}" onclick="selectVariant(this)">${esc(val)}</button>`).join("")}</div></div>`).join("")}</div><div class="stock-line">${p.stock>0?`<b>In Stock</b> · ${p.stock} available`:`<b>Out of Stock</b>`}</div><div class="buy-row"><div class="detail-qty"><button onclick="detailQty(-1)">−</button><span id="detailQty">1</span><button onclick="detailQty(1)">+</button></div><button class="btn primary detail-add" ${p.stock<1?"disabled":""} onclick="addDetailToCart('${p._id}')">Add to Bag</button><a class="btn whatsapp-btn" href="${waUrl(p.name)}" target="_blank">WhatsApp</a></div><div class="detail-description"><h3>Product Description</h3><p>${esc(p.description||"Authentic beauty and personal-care product selected for the Beausion.pk collection.")}</p></div><div class="detail-meta"><span>✓ Authentic products</span><span>✓ Secure checkout</span><span>✓ Easy support</span></div></div></div><section class="related-section"><div class="section-head"><h2>Related Products</h2><p>You may also like</p></div><div id="relatedProducts" class="product-grid"><div class="loading-state">Loading related products…</div></div></section>`;
  loadRelatedProducts(p);
}
function selectVariant(btn){const group=btn.dataset.group;document.querySelectorAll(`.variant-option[data-group="${group}"]`).forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");}
function getSelectedVariants(){return [...document.querySelectorAll(".variant-group")].map(g=>{const label=g.querySelector(".variant-label")?.textContent?.replace(/:$/,'')||"";const value=g.querySelector(".variant-option.selected")?.dataset.value||"";return label&&value?`${label}: ${value}`:""}).filter(Boolean).join(" | ");}
async function loadRelatedProducts(p){const el=document.getElementById("relatedProducts");if(!el)return;try{const r=await fetch(`/api/products?category=${encodeURIComponent(p.category||"")}`);if(!r.ok)throw new Error();const list=(await r.json()).filter(x=>String(x._id)!==String(p._id)).slice(0,4);el.innerHTML=list.length?list.map(productCard).join(""):`<div class="empty-state"><p>No related products yet.</p></div>`;}catch{el.innerHTML=`<div class="empty-state"><p>Could not load related products.</p></div>`;}}
function setDetailImage(src){const el=document.getElementById("detailMainImage");if(el)el.src=src;document.querySelectorAll(".detail-thumbs button").forEach(b=>b.classList.remove("active"));event?.currentTarget?.classList.add("active")}
function detailQty(d){const el=document.getElementById("detailQty");if(!el)return;let n=Math.max(1,Number(el.textContent)+d);const p=products[0];if(p?.stock)n=Math.min(n,p.stock);el.textContent=n;}
function addDetailToCart(id){const p=products.find(x=>x._id===id);if(!p||p.stock<1)return;const qty=Number(document.getElementById("detailQty")?.textContent||1);const variant=getSelectedVariants();const existing=cart.find(x=>x.productId===id&&x.variant===variant);if(existing)existing.quantity+=qty;else cart.push({productId:id,name:p.name,price:p.price,image:p.image,quantity:qty,size:"",variant});saveCart();showToast(`${p.name}${variant?` (${variant})`:""} added to your bag.`);openCart();}
function addToCart(id){const p=products.find(x=>x._id===id);if(!p)return;const existing=cart.find(x=>x.productId===id);if(existing)existing.quantity++;else cart.push({productId:id,name:p.name,price:p.price,image:p.image,quantity:1,size:""});saveCart();showToast(`${p.name} added to your bag.`);openCart();}
function saveCart(){localStorage.setItem("beausionCart",JSON.stringify(cart));updateCartCount();}
function updateCartCount(){const el=document.getElementById("cartCount");if(el)el.textContent=cart.reduce((s,x)=>s+x.quantity,0)}
function openCart(){renderCart();document.getElementById("cartModal")?.classList.add("open")}
function closeCart(){document.getElementById("cartModal")?.classList.remove("open")}
function renderCart(){const el=document.getElementById("cartItems");if(!el)return;if(!cart.length){el.innerHTML="<p class='muted'>Your bag is empty.</p>";document.getElementById("cartTotal").textContent=money(0);return;}el.innerHTML=cart.map((x,i)=>`<div class="cart-line"><div><b>${esc(x.name)}</b><div class="muted">${money(x.price)} × ${x.quantity}${x.variant?`<br><small>${esc(x.variant)}</small>`:""}</div></div><div class="qty"><button onclick="changeQty(${i},-1)">−</button><button onclick="changeQty(${i},1)">+</button><button onclick="removeItem(${i})">×</button></div></div>`).join("");document.getElementById("cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.quantity,0));}
function changeQty(i,d){cart[i].quantity+=d;if(cart[i].quantity<=0)cart.splice(i,1);saveCart();renderCart()}
function removeItem(i){cart.splice(i,1);saveCart();renderCart()}
function showCheckout(){if(!cart.length){showToast("Your bag is empty.");return;}closeCart();document.getElementById("checkoutModal")?.classList.add("open")}
function closeCheckout(){document.getElementById("checkoutModal")?.classList.remove("open")}
function showToast(text){const t=document.getElementById("toast");if(!t)return;t.textContent=text;t.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),1800)}
function backdropClose(e,id){if(e.target.id===id)document.getElementById(id).classList.remove("open")}
function toggleMenu(){document.getElementById("nav")?.classList.toggle("open")}

document.getElementById("checkoutForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target);const customer={name:f.get("name"),phone:f.get("phone"),city:f.get("city"),address:f.get("address")};const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer,items:cart,paymentMethod:f.get("paymentMethod")})});const data=await res.json();const msg=document.getElementById("checkoutMessage");if(res.ok){msg.textContent=`Order placed successfully. Order ID: ${data.orderId}`;cart=[];saveCart();e.target.reset();}else msg.textContent=data.message||"Order failed";});
document.addEventListener("click",e=>{if(e.target.closest("#nav a"))document.getElementById("nav")?.classList.remove("open")});

(async()=>{updateCartCount();setWhatsAppLinks();await fetchCategories();renderHeroSlider();renderCategories();await Promise.all([loadFeatured(),loadCategoryPage(),loadProductDetail()]);})();
