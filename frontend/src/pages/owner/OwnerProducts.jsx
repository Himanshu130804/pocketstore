import React,{useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Archive,Barcode,Boxes,ChevronDown,ImagePlus,PackagePlus,Search,SlidersHorizontal,Tag,Trash2,X} from 'lucide-react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import CreatableCategorySelect from '../../components/forms/CreatableCategorySelect';
import PageState from '../../components/common/PageState';
import './OwnerProducts.css';
import {useWorkspace} from '../../context/WorkspaceContext';

const fulfilmentOptions=[
  ['walk_in','Walk-in','Sell directly at the counter'],
  ['pickup','Pickup','Customer collects from the shop'],
  ['delivery','Delivery','Deliver to customer address'],
  ['reserve','Reserve','Hold stock for later collection'],
  ['express_pickup','Express pickup','Priority preparation queue'],
  ['preorder','Preorder','Accept orders before availability']
];
const units=['piece','pack','box','bottle','kg','g','litre','ml','metre','custom'];
const blank={name:'',shortDescription:'',brand:'',manufacturer:'',countryOfOrigin:'India',sku:'',barcode:'',hsnCode:'',category:'',subcategory:'',description:'',tags:'',unit:'piece',customUnit:'',price:'',costPrice:'',mrp:'',gstRate:'0',taxInclusive:true,stockQty:'',lowStockThreshold:'5',reorderLevel:'5',maxStockLevel:'',fulfilmentModes:['walk_in','pickup'],status:'published',isSeasonal:false,variants:[]};
const money=p=>`₹${((p||0)/100).toFixed(2)}`;
const prettyMode=m=>m.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function OwnerProducts(){
  const {activeShop:shop,loading:workspaceLoading,error:workspaceError,refresh}=useWorkspace();
  const [products,setProducts]=useState([]);
  const [form,setForm]=useState(blank);
  const [variant,setVariant]=useState({name:'',sku:'',barcode:'',price:'',mrp:'',costPrice:'',stockQty:'',lowStockThreshold:'2',weightValue:'',weightUnit:'g'});
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [uploading,setUploading]=useState('');
  const [query,setQuery]=useState('');
  const [categoryFilter,setCategoryFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('active');

  const load=async currentShop=>{
    if(!currentShop)return;
    setLoading(true);setError('');
    try{const r=await api.get(`/products/shop/${currentShop._id}`);setProducts(Array.isArray(r.data?.products)?r.data.products:[])}
    catch(e){setError(e.response?.data?.message||'Could not load products.')}
    finally{setLoading(false)}
  };
  useEffect(()=>{if(shop)load(shop)},[shop?._id]);

  const categories=useMemo(()=>[...new Set(products.map(p=>p.category).filter(Boolean))].sort(),[products]);
  const filtered=useMemo(()=>products.filter(p=>{
    const q=query.trim().toLowerCase();
    const match=!q||[p.name,p.sku,p.brand,p.category,p.subcategory,p.barcode,...(p.tags||[])].some(v=>String(v||'').toLowerCase().includes(q));
    const categoryOk=categoryFilter==='all'||p.category===categoryFilter;
    const statusOk=statusFilter==='all'||(statusFilter==='active'?p.status!=='archived':p.status===statusFilter);
    return match&&categoryOk&&statusOk;
  }),[products,query,categoryFilter,statusFilter]);

  const toggleMode=mode=>setForm(current=>({...current,fulfilmentModes:current.fulfilmentModes.includes(mode)?current.fulfilmentModes.filter(x=>x!==mode):[...current.fulfilmentModes,mode]}));

  const addVariant=()=>{
    if(!variant.name.trim())return setError('Enter a variant name before adding it.');
    const price=Number(variant.price||form.price||0);
    if(!Number.isFinite(price)||price<0)return setError('Variant price is invalid.');
    setError('');
    setForm(current=>({...current,variants:[...current.variants,{
      name:variant.name.trim(),sku:variant.sku.trim(),barcode:variant.barcode.trim(),pricePaise:Math.round(price*100),mrpPaise:variant.mrp?Math.round(Number(variant.mrp)*100):undefined,costPricePaise:variant.costPrice?Math.round(Number(variant.costPrice)*100):0,stockQty:Number(variant.stockQty||0),lowStockThreshold:Number(variant.lowStockThreshold||2),weightValue:variant.weightValue?Number(variant.weightValue):undefined,weightUnit:variant.weightUnit
    }]}));
    setVariant({name:'',sku:'',barcode:'',price:'',mrp:'',costPrice:'',stockQty:'',lowStockThreshold:'2',weightValue:'',weightUnit:'g'});
  };

  const add=async e=>{
    e.preventDefault();
    if(!shop)return;
    if(!form.fulfilmentModes.length)return setError('Select at least one fulfilment option.');
    if(form.mrp&&Number(form.mrp)<Number(form.price))return setError('MRP cannot be lower than the selling price.');
    setSaving(true);setError('');setSuccess('');
    try{
      const payload={...form,shopId:shop._id,pricePaise:Math.round(Number(form.price)*100),costPricePaise:Math.round(Number(form.costPrice||0)*100),mrpPaise:form.mrp?Math.round(Number(form.mrp)*100):undefined,stockQty:Number(form.stockQty),lowStockThreshold:Number(form.lowStockThreshold||0),reorderLevel:Number(form.reorderLevel||0),maxStockLevel:form.maxStockLevel?Number(form.maxStockLevel):undefined,gstRate:Number(form.gstRate||0),tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),unit:form.unit==='custom'?(form.customUnit||'custom'):form.unit,variants:form.variants};
      await api.post('/products',payload);
      setForm(blank);setShowForm(false);setSuccess('Product added successfully. Upload its main image and gallery from the catalogue below.');
      await load(shop);
    }catch(e){setError(e.response?.data?.message||'Could not create product. Check required fields and use a unique SKU.')}
    finally{setSaving(false)}
  };

  const upload=async(product,files,gallery=false)=>{
    if(!files)return;setUploading(product._id);setError('');
    try{const fd=new FormData();if(gallery){[...files].forEach(f=>fd.append('images',f));await api.post(`/media/products/${product._id}/gallery`,fd)}else{fd.append('image',files);await api.post(`/media/products/${product._id}/image`,fd)}setSuccess('Product media updated.');await load(shop)}
    catch(e){setError(e.response?.data?.message||'Image upload failed.')}
    finally{setUploading('')}
  };

  const changeStatus=async(product,status)=>{
    try{await api.patch(`/products/${product._id}`,{status});setSuccess(`${product.name} is now ${status}.`);await load(shop)}catch(e){setError(e.response?.data?.message||'Could not update product status.')}
  };
  const remove=async product=>{
    if(!window.confirm(product.status==='archived'?`Permanently delete ${product.name}?`:`Archive ${product.name}? It will disappear from customer listings, POS, purchases and active inventory while its history remains available.`))return;
    try{await api.delete(`/products/${product._id}`);setSuccess(product.status==='archived'?'Product deleted permanently.':'Product archived and removed from active inventory.');await load(shop)}catch(e){setError(e.response?.data?.message||'Could not remove product.')}
  };

  const columns=[
    {key:'image',label:'Media',render:p=><div className="owner-product-media">{p.imageUrl?<img src={`${import.meta.env.VITE_API_ORIGIN||'http://localhost:5000'}${p.imageUrl}`} alt={p.name}/>:<div className="product-image-placeholder"><ImagePlus size={18}/></div>}<div className="media-links"><label>Cover<input type="file" accept="image/*" onChange={e=>upload(p,e.target.files[0])}/></label><label>Gallery<input type="file" accept="image/*" multiple onChange={e=>upload(p,e.target.files,true)}/></label></div>{uploading===p._id&&<small>Uploading…</small>}</div>},
    {key:'name',label:'Product',render:p=><div className="product-main-cell"><b>{p.name}</b><small>{p.brand||'Unbranded'} · {p.category||'Uncategorised'}</small><span className={`catalogue-status ${p.status}`}>{p.status}</span></div>},
    {key:'sku',label:'SKU / barcode',render:p=><div><b>{p.sku}</b><small>{p.barcode||'No barcode'}</small></div>},
    {key:'pricing',label:'Pricing',render:p=><div><b>{money(p.pricePaise)}</b><small>MRP {p.mrpPaise?money(p.mrpPaise):'—'} · Cost {money(p.costPricePaise)}</small></div>},
    {key:'stockQty',label:'Stock',render:p=><div><b className={(p.stockQty||0)<=Number(p.lowStockThreshold||0)?'stock-low':'stock-ok'}>{p.stockQty||0} {p.unit}</b><small>Alert at {p.lowStockThreshold||0}</small></div>},
    {key:'modes',label:'Fulfilment',render:p=><div className="mode-chip-list">{(p.fulfilmentModes||[]).map(m=><span key={m}>{prettyMode(m)}</span>)}</div>},
    {key:'actions',label:'Actions',render:p=><div className="catalogue-actions"><select aria-label={`Change ${p.name} status`} value={p.status} onChange={e=>changeStatus(p,e.target.value)}><option value="published">Published</option><option value="draft">Draft</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select><button className="icon-danger" title={p.status==='archived'?'Delete permanently':'Archive product'} onClick={()=>remove(p)}>{p.status==='archived'?<Trash2 size={16}/>:<Archive size={16}/>}</button></div>}
  ];

  if(workspaceLoading)return <PageState title="Loading your shop" message="Please wait while PocketStore loads your business workspace."/>;
  if(workspaceError&&!shop)return <PageState title="Shop could not be loaded" message={workspaceError} actionLabel="Retry" onAction={refresh}/>;
  if(!shop)return <PageState title="Create your first shop" message="Products can be added after you create a shop and submit it for approval." actionLabel="Create shop" actionTo="/owner"/>;

  return <div className="owner-products-page">
    <div className="dash-title owner-page-actions"><div><span className="eyebrow"><Boxes size={15}/> Catalogue workspace</span><h1>Products, variants & media</h1><p>Build a customer-ready catalogue for <b>{shop.name}</b>.</p></div><button className="primary-action" onClick={()=>{setShowForm(v=>!v);setError('');setSuccess('')}}>{showForm?<><X size={17}/> Close form</>:<><PackagePlus size={17}/> Add product</>}</button></div>
    {shop.status!=='approved'&&<div className="owner-warning">Your shop is <b>{shop.status}</b>. You can prepare the catalogue now; customers see products after approval and when the shop is live.</div>}
    {error&&<div className="owner-alert error">{error}</div>}{success&&<div className="owner-alert success">{success}</div>}

    {showForm&&<section className="panel product-create-panel"><form className="product-editor" onSubmit={add}>
      <header className="editor-header"><div><span>New catalogue item</span><h2>Add a product</h2><p>Use one SKU for every identical unit. Create separate variants only for size, colour, storage, weight or pack differences.</p></div><div className="editor-status"><label>Listing status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="published">Published</option><option value="draft">Draft</option><option value="hidden">Hidden</option></select></label></div></header>

      <div className="editor-section"><div className="section-intro"><Tag/><div><h3>Basic information</h3><p>Name, catalogue classification and identifiers.</p></div></div><div className="editor-grid">
        <label>Product name *<input required placeholder="e.g. Cadbury Dairy Milk 10g" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Brand<input placeholder="e.g. Cadbury" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label>
        <label>Unique SKU *<input required placeholder="e.g. DM-10G" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value.toUpperCase().replace(/\s+/g,'-')})}/><small>Shared by all identical units of this product.</small></label>
        <label>Barcode<input placeholder="Scan or type barcode" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></label>
        <label>Category *<CreatableCategorySelect scope="product" value={form.category} onChange={category=>setForm({...form,category})}/></label>
        <label>Subcategory<input placeholder="e.g. Chocolate bars" value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})}/></label>
        <label className="span-2">Short description<input maxLength="120" placeholder="One-line summary shown on cards" value={form.shortDescription} onChange={e=>setForm({...form,shortDescription:e.target.value})}/></label>
        <label className="span-2">Full description<textarea placeholder="Ingredients, usage, key features and customer-facing details" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label>Manufacturer<input value={form.manufacturer} onChange={e=>setForm({...form,manufacturer:e.target.value})}/></label>
        <label>Country of origin<input value={form.countryOfOrigin} onChange={e=>setForm({...form,countryOfOrigin:e.target.value})}/></label>
        <label>HSN code<input value={form.hsnCode} onChange={e=>setForm({...form,hsnCode:e.target.value})}/></label>
        <label>Search tags<input placeholder="chocolate, snack, cadbury" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/></label>
      </div></div>

      <div className="editor-section"><div className="section-intro"><Barcode/><div><h3>Pricing & tax</h3><p>Cost, selling price, MRP and GST.</p></div></div><div className="editor-grid four-col">
        <label>Cost price ₹<input min="0" type="number" step="0.01" value={form.costPrice} onChange={e=>setForm({...form,costPrice:e.target.value})}/></label>
        <label>Selling price ₹ *<input required min="0" type="number" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
        <label>MRP ₹<input min="0" type="number" step="0.01" value={form.mrp} onChange={e=>setForm({...form,mrp:e.target.value})}/></label>
        <label>GST %<select value={form.gstRate} onChange={e=>setForm({...form,gstRate:e.target.value})}>{[0,3,5,12,18,28].map(x=><option key={x} value={x}>{x}%</option>)}</select></label>
        <div className="calculated-tile"><span>Profit per unit</span><b>{money(Math.max(0,(Number(form.price||0)-Number(form.costPrice||0))*100))}</b></div>
        <div className="calculated-tile"><span>Discount</span><b>{form.mrp&&Number(form.mrp)>0?`${Math.max(0,Math.round((1-Number(form.price||0)/Number(form.mrp))*100))}%`:'0%'}</b></div>
        <label className="switch-row span-2"><input type="checkbox" checked={form.taxInclusive} onChange={e=>setForm({...form,taxInclusive:e.target.checked})}/><span>Prices include GST</span></label>
      </div></div>

      <div className="editor-section"><div className="section-intro"><Boxes/><div><h3>Inventory controls</h3><p>Opening quantity and stock alerts.</p></div></div><div className="editor-grid four-col">
        <label>Opening stock *<input required min="0" type="number" value={form.stockQty} onChange={e=>setForm({...form,stockQty:e.target.value})}/></label>
        <label>Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{units.map(x=><option key={x} value={x}>{x.replace(/^./,c=>c.toUpperCase())}</option>)}</select></label>
        {form.unit==='custom'&&<label>Custom unit<input required value={form.customUnit} onChange={e=>setForm({...form,customUnit:e.target.value})}/></label>}
        <label>Low-stock alert<input min="0" type="number" value={form.lowStockThreshold} onChange={e=>setForm({...form,lowStockThreshold:e.target.value})}/></label>
        <label>Reorder level<input min="0" type="number" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:e.target.value})}/></label>
        <label>Maximum stock<input min="0" type="number" value={form.maxStockLevel} onChange={e=>setForm({...form,maxStockLevel:e.target.value})}/></label>
      </div></div>

      <div className="editor-section"><div className="section-intro"><SlidersHorizontal/><div><h3>Fulfilment options</h3><p>Select every way this specific product can be sold. Multiple options can be active together.</p></div></div><div className="fulfilment-matrix">
        {fulfilmentOptions.map(([value,label,help])=><label key={value} className={form.fulfilmentModes.includes(value)?'selected':''}><input type="checkbox" checked={form.fulfilmentModes.includes(value)} onChange={()=>toggleMode(value)}/><span><b>{label}</b><small>{help}</small></span></label>)}
      </div></div>

      <div className="editor-section"><div className="section-intro"><ChevronDown/><div><h3>Optional variants</h3><p>Use variants only when price or stock changes by option.</p></div></div><div className="variant-builder-pro"><div className="variant-inputs">
        <input placeholder="Variant name (e.g. 20g)" value={variant.name} onChange={e=>setVariant({...variant,name:e.target.value})}/><input placeholder="Variant SKU" value={variant.sku} onChange={e=>setVariant({...variant,sku:e.target.value.toUpperCase().replace(/\s+/g,'-')})}/><input placeholder="Barcode" value={variant.barcode} onChange={e=>setVariant({...variant,barcode:e.target.value})}/><input type="number" step="0.01" placeholder="Selling price ₹" value={variant.price} onChange={e=>setVariant({...variant,price:e.target.value})}/><input type="number" step="0.01" placeholder="MRP ₹" value={variant.mrp} onChange={e=>setVariant({...variant,mrp:e.target.value})}/><input type="number" placeholder="Stock" value={variant.stockQty} onChange={e=>setVariant({...variant,stockQty:e.target.value})}/><button type="button" className="secondary-action" onClick={addVariant}>Add variant</button>
      </div>{form.variants.length>0&&<div className="variant-list">{form.variants.map((v,i)=><article key={`${v.name}-${i}`}><div><b>{v.name}</b><span>{v.sku||'No SKU'} · {money(v.pricePaise)} · Stock {v.stockQty}</span></div><button type="button" onClick={()=>setForm({...form,variants:form.variants.filter((_,x)=>x!==i)})}><X size={15}/> Remove</button></article>)}</div>}</div></div>

      <footer className="editor-actions"><button type="button" className="secondary-action" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-action" disabled={saving}>{saving?'Adding product…':'Add product to catalogue'}</button></footer>
    </form></section>}

    <section className="catalogue-toolbar"><div className="catalogue-search"><Search size={18}/><input placeholder="Search name, SKU, barcode, brand or category" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="active">Active catalogue</option><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select><span>{filtered.length} of {products.length} products</span></section>
    {loading?<PageState title="Loading products" message="Fetching your shop catalogue…"/>:<DataTable columns={columns} rows={filtered} empty={products.length?'No products match these filters.':'No products yet. Click Add product to create your first listing.'}/>} 
    {!products.length&&!showForm&&<div className="owner-empty-actions"><button className="primary-action" onClick={()=>setShowForm(true)}><PackagePlus size={17}/> Add your first product</button><Link to="/owner/inventory">Open inventory ledger</Link></div>}
  </div>;
}
