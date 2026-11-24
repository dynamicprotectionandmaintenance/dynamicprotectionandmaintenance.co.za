const galleryDb = window.supabase.createClient('https://lzckbvvkjczdlkepyann.supabase.co','sb_publishable_okoGW3guP_Z-54fAckVCRw_sNBZj0Xq',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
async function loadGallery(){
 const grid=document.getElementById('galleryGrid');
 const {data,error}=await galleryDb.from('gallery_projects').select('id,title,description,image_path').order('created_at',{ascending:false});
 grid.replaceChildren();
 if(error||!data.length){const p=document.createElement('p');p.className='gallery-message';p.textContent=error?'Unable to load projects. Please try again later.':'Project photographs will be available soon.';grid.append(p);return;}
 for(const project of data){const card=document.createElement('article');card.className='project-card';const img=document.createElement('img');img.src=galleryDb.storage.from('gallery-images').getPublicUrl(project.image_path).data.publicUrl;img.alt=project.title||'Completed project';img.loading='lazy';img.tabIndex=0;img.setAttribute('role','button');img.onclick=()=>openImage(img.src,img.alt);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click();}};card.append(img);if(project.title||project.description){const details=document.createElement('div');details.className='project-details';const h=document.createElement('h3');h.textContent=project.title;const p=document.createElement('p');p.textContent=project.description;details.append(h,p);card.append(details);}grid.append(card);}
}
loadGallery().catch(()=>{document.getElementById('galleryGrid').textContent='Unable to load projects.';});
