(()=>{
/* ================= utilities ================= */
const DAY=864e5;
const today0=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const fmtISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(base,n)=>fmtISO(new Date(parse(base).getTime()+n*DAY));
const daysUntil=s=>Math.round((parse(s)-today0())/DAY);
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const fDate=s=>{const d=parse(s);return `${d.getDate()} ${MES[d.getMonth()]}`};
const fLong=s=>{const d=parse(s);return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESL[d.getMonth()]} de ${d.getFullYear()}`};
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Math.round(n));
const moneyK=n=>n>=1e6?'$ '+(n/1e6).toLocaleString('es-AR',{maximumFractionDigits:1})+' M':money(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ids y tokens con crypto: los ids viajan a la base como clave primaria y el
   token es lo único que protege el link personal de cada invitado */
const rnd=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return Array.from(a,b=>'abcdefghijkmnpqrstuvwxyz23456789'[b&31]).join('')};
const uid=()=>rnd(10);
const tok=()=>rnd(12);
const safeUrl=u=>/^https?:\/\//i.test(String(u||'').trim())?String(u).trim():'';
/* íconos dibujados, un solo trazo de 1.6 */
const IC={
  agenda:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  inbox:'<path d="M3.5 13.5 6 5.5h12l2.5 8V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 13.5h4.5l1.5 2.5h5l1.5-2.5h4.5"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  left:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  right:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  out:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>',
  rings:'<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
};
const ic=(n,cls='')=>`<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IC[n]}</svg>`;
const pct=(a,b)=>b?Math.round(a/b*100):0;
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const coupleHTML=c=>esc(c).replace(' &amp; ',' <i>&amp;</i> ');
const slugify=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/&/g,'y').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const firstName=s=>String(s).trim().split(' ')[0];

/* ================= seed data ================= */
const VSTAT=['contactado','presupuestado','aprobado','senado','confirmado'];
const VLABEL={contactado:'Contactado',presupuestado:'Presupuestado',aprobado:'Aprobado por novios',senado:'Señado',confirmado:'Confirmado'};
const RSVP={si:'Confirmó',no:'No viene',pendiente:'Pendiente'};
const PLANS=['Full planning','Planificación parcial','Coordinación del día','Asesoría'];
const LOGKIND=['Reunión','Llamada','WhatsApp','Mail','Nota'];
const MEETKIND=['Reunión','Degustación','Visita al lugar','Prueba de vestido','Ensayo','Otro'];
const LEADSRC=['Instagram','Recomendación','Web','Feria de novios','Otro proveedor'];
const WSTATUS={lead:'Consulta',activa:'En curso',finalizada:'Finalizada'};
const FEE_RATE=.08;

function seed(){
  const base=fmtISO(today0());
  const specs=[
    {couple:'Lucía & Tomás',off:25,venue:'Finca Los Álamos',city:'Tafí Viejo',target:120,budget:32e6,style:'Campestre al atardecer',p:.86,s:11,
      plan:'Full planning',
      p1:{name:'Lucía Paz',phone:'+54 381 455-2233',email:'lucia.paz@gmail.com',ig:'@lupaz'},
      p2:{name:'Tomás Frías',phone:'+54 381 466-1190',email:'tfrias@gmail.com',ig:'@tomasfrias'},
      how:'Se conocieron en la facultad en 2016. Se comprometieron en Tafí del Valle.',
      palette:'Verde oliva, crema y terracota',song:'Cielo — Bandalos Chinos',
      witnesses:'Marina Paz (hermana) y Gonzalo Sal (amigo)',address:'Av. Aconquija 1840, Yerba Buena',
      faq:{dress:'Elegante sport. La ceremonia es en el jardín, así que evitá tacos finos.',
        gifts:'Su presencia es el mejor regalo. Si querés colaborar con la luna de miel, el alias está en la invitación.',
        kids:'Sí, los chicos son bienvenidos. Avisanos si venís con menores para reservarles menú.',
        lodging:'Hay tarifa para invitados en el hotel de Tafí Viejo. Pedinos el código.',
        transport:'Sale un micro desde la plaza de Yerba Buena a las 18:30 y vuelve a las 4:30.',
        extra:'La finca tiene estacionamiento propio, no hace falta reservar lugar.'}},
    {couple:'Valentina & Joaquín',off:53,venue:'Salón Las Magnolias',city:'Yerba Buena',target:180,budget:45e6,style:'Clásica de noche',p:.62,s:23,
      plan:'Full planning',
      p1:{name:'Valentina Terán',phone:'+54 381 470-8812',email:'valen.teran@gmail.com',ig:'@valenteran'},
      p2:{name:'Joaquín Colombres',phone:'+54 381 415-3367',email:'joaco.colombres@gmail.com',ig:'@joacocolombres'},
      how:'Amigos del colegio desde los 15. Están juntos hace 9 años.',
      palette:'Blanco, dorado y verde inglés',song:'At Last — Etta James',
      witnesses:'Los padres de ambos',address:'Bascary 290, Yerba Buena',
      faq:{dress:'Etiqueta. Es de noche y en salón: traje oscuro y vestido largo.',
        gifts:'Hay lista de regalos en la invitación y también alias para transferencia.',
        kids:'La fiesta es solo para adultos. Va a haber servicio de niñera en el salón de al lado para los más chicos de la familia.',
        lodging:'Para los que vienen de afuera reservamos habitaciones en Yerba Buena. Escribinos y te pasamos el contacto.',
        transport:'Hay estacionamiento en el salón y remises de vuelta hasta las 5.',
        extra:''}},
    {couple:'Camila & Martín',off:150,venue:'Estancia El Churqui',city:'Tafí del Valle',target:90,budget:26e6,style:'Boho en la montaña',p:.3,s:37,
      plan:'Planificación parcial',
      p1:{name:'Camila Nougués',phone:'+54 381 433-9021',email:'cami.nougues@gmail.com',ig:'@caminougues'},
      p2:{name:'Martín Herrera',phone:'+54 381 488-7745',email:'martinherrera@gmail.com',ig:'@martinhh'},
      how:'Se conocieron trekking en el cerro. Viven en Buenos Aires y vuelven a casarse acá.',
      palette:'Tierras, beige y flores secas',song:'Home — Edward Sharpe',
      witnesses:'A definir',address:'Viven en CABA — coordinar por videollamada',
      faq:{dress:'Boho, cómodo y en tonos tierra. Es en la montaña y refresca de noche: traé abrigo.',
        gifts:'Preferimos que uses esa plata en el viaje hasta Tafí del Valle. Con que vengas estamos.',
        kids:'',
        lodging:'Bloqueamos cabañas en Tafí del Valle. La reserva la hace cada uno, pedinos el contacto.',
        transport:'',
        extra:''}},
    {couple:'Sofía & Nicolás',off:205,venue:'Casona Solís',city:'San Miguel de Tucumán',target:60,budget:18e6,style:'Íntima urbana',p:.14,s:51,
      plan:'Coordinación del día',
      p1:{name:'Sofía Medina',phone:'+54 381 402-1156',email:'sofiamedina@gmail.com',ig:'@sofimedina'},
      p2:{name:'Nicolás Aráoz',phone:'+54 381 491-6604',email:'nico.araoz@gmail.com',ig:'@nicoaraoz'},
      how:'Se conocieron trabajando. Quieren algo chico, solo familia y amigos cercanos.',
      palette:'Negro, blanco y bordó',song:'Sunday Morning — Maroon 5',
      witnesses:'Pendiente',address:'San Lorenzo 455, San Miguel de Tucumán',
      faq:{dress:'',gifts:'',kids:'',lodging:'',transport:'',extra:''}},
  ];
  const leadSpecs=[
    {couple:'Agustina & Ramiro',off:330,city:'Tafí Viejo',target:140,budget:38e6,src:'Instagram',first:-4,
      p1:{name:'Agustina Robles',phone:'+54 381 476-2290',email:'agus.robles@gmail.com',ig:'@agusrobles'},
      p2:{name:'Ramiro Ledesma',phone:'+54 381 451-7733',email:'ramiroledesma@gmail.com',ig:'@ramiled'},
      note:'Escribieron por Instagram. Todavía no tienen fecha cerrada ni lugar. Quieren presupuesto de full planning.'},
    {couple:'Belén & Franco',off:400,city:'Yerba Buena',target:200,budget:60e6,src:'Recomendación',first:-11,
      p1:{name:'Belén Figueroa',phone:'+54 381 428-5510',email:'belufigueroa@gmail.com',ig:'@belufigueroa'},
      p2:{name:'Franco Villagra',phone:'+54 381 439-2087',email:'francovillagra@gmail.com',ig:'@francov'},
      note:'Los recomendó el catering Sabores del Norte. Fiesta grande. Pidieron reunión para el mes que viene.'},
    {couple:'Rocío & Emiliano',off:275,city:'Tafí del Valle',target:70,budget:20e6,src:'Web',first:-25,
      p1:{name:'Rocío Juárez',phone:'+54 381 466-3318',email:'rociojuarez@gmail.com',ig:'@rojuarez'},
      p2:{name:'Emiliano Soria',phone:'+54 381 482-9964',email:'emisoria@gmail.com',ig:'@emisoria'},
      note:'Consulta por el formulario de la web. Presupuesto ajustado, evalúan solo coordinación del día.'},
  ];
  return {weddings:specs.map(sp=>buildWedding(sp,addDays(base,sp.off))).concat(leadSpecs.map(sp=>buildLead(sp,addDays(base,sp.off)))),v:5};
}

/* seña / segundo pago / saldo: así se paga de verdad a un proveedor */
function planPagos(ex,date){
  const parts=[['Seña',.3,-120],['Segundo pago',.3,-45],['Saldo',.4,-5]];
  let acum=0;
  ex.plan=parts.map(([label,f,off],i)=>{
    const amount=i===2?ex.total-acum:Math.round(ex.total*f/1000)*1000;
    acum+=amount;
    return {id:uid(),label,amount,due:addDays(date,off),paid:false};
  });
  /* marcamos como pagadas las cuotas que ya cubre lo que se pagó */
  let resto=ex.paid;
  ex.plan.forEach(c=>{if(resto>=c.amount){c.paid=true;resto-=c.amount}});
  ex.due=(ex.plan.find(c=>!c.paid)||ex.plan[ex.plan.length-1]).due;
  return ex;
}
const planDe=e=>e.plan&&e.plan.length?e.plan:null;

/* honorarios del estudio: lo que cobra la planner, aparte del presupuesto de la boda */
function makeContract(sp,date,fee){
  const parts=[['Firma de contrato',.4,-260],['Segundo pago',.3,-95],['Saldo final',.3,-15]];
  const installments=parts.map(([label,f,off])=>{
    const due=addDays(date,off), amount=Math.round(fee*f/1000)*1000, paid=daysUntil(due)<0&&sp.p>0;
    return {id:uid(),label,amount,due,paid,paidOn:paid?due:null};
  });
  return {plan:sp.plan||'Full planning',fee,signed:installments[0].paid?installments[0].due:null,installments};
}
function buildLead(sp,date){
  const fee=Math.round(sp.budget*FEE_RATE/1000)*1000, first=addDays(fmtISO(today0()),sp.first);
  return {id:uid(),slug:slugify(sp.couple),status:'lead',couple:sp.couple,date,venue:'A definir',city:sp.city,
    target:sp.target,budget:sp.budget,style:'Por definir',tables:Math.ceil(sp.target/10),
    partners:[{id:uid(),role:'Novia',...sp.p1},{id:uid(),role:'Novio',...sp.p2}],
    profile:{how:'',palette:'',song:'',witnesses:'',address:'',notes:sp.note,
      faq:{dress:'',gifts:'',kids:'',lodging:'',transport:'',extra:''}},
    messages:[],
    contract:{plan:'A presupuestar',fee,signed:null,installments:[]},
    lead:{source:sp.src,first,quoted:fee},
    log:[{id:uid(),date:first,kind:'Nota',title:'Primer contacto por '+sp.src,body:sp.note}],
    meetings:[],docs:[],tableMeta:[],guests:[],vendors:[],expenses:[],tasks:[],timeline:[]};
}
function buildWedding(sp,date){
  const R=rng(sp.s), pick=a=>a[Math.floor(R()*a.length)];
  const half=sp.couple.split('&');
  const w={id:uid(),slug:slugify(sp.couple),status:'activa',couple:sp.couple,date,venue:sp.venue,city:sp.city,
    target:sp.target,budget:sp.budget,style:sp.style,tables:Math.ceil(sp.target/10),
    partners:[
      {id:uid(),role:'Novia',name:(half[0]||'').trim(),phone:'',email:'',ig:'',...(sp.p1||{})},
      {id:uid(),role:'Novio',name:(half[1]||'').trim(),phone:'',email:'',ig:'',...(sp.p2||{})}],
    profile:{how:sp.how||'',palette:sp.palette||'',song:sp.song||'',witnesses:sp.witnesses||'',address:sp.address||'',notes:'',
      faq:{dress:'',gifts:'',kids:'',lodging:'',transport:'',extra:'',...(sp.faq||{})}},
    messages:[],
    contract:makeContract(sp,date,Math.round(sp.budget*FEE_RATE/1000)*1000),
    log:[],meetings:[],docs:[],tableMeta:[],
    guests:[],vendors:[],expenses:[],tasks:[],timeline:[]};
  /* guests */
  const F=['Agustina','Martina','Florencia','Carolina','Julieta','Micaela','Rocío','Paula','Belén','Victoria','Luciana','Antonella','Mercedes','Josefina','Candela','Gabriela','Silvia','Marta','Rosa','Ana','Juan','Pablo','Diego','Facundo','Matías','Santiago','Federico','Gonzalo','Lucas','Ignacio','Ramiro','Emiliano','Sebastián','Leandro','Hernán','Jorge','Carlos','Ricardo','Alberto','Franco'];
  const L=['Paz','Frías','Terán','Posse','Colombres','Avellaneda','Nougués','Sal','Díaz','López','Romano','Gómez','Herrera','Juárez','Medina','Soria','Ledesma','Aráoz','Correa','Villagra','Suárez','Robles','Figueroa','Acosta','Molina','Ruiz','Heredia','Paliza'];
  const G=['Familia','Familia','Amigos','Amigos','Amigos','Trabajo','Facultad'];
  const n=Math.round(sp.target*.96);
  for(let i=0;i<n;i++){
    const r=R(); let rsvp='pendiente';
    if(r<sp.p*.82) rsvp='si'; else if(r<sp.p*.82+sp.p*.1) rsvp='no';
    const dr=R(); const diet=dr<.08?'Vegetariano':dr<.12?'Celíaco':dr<.14?'Vegano':'';
    const group=pick(G);
    w.guests.push({id:uid(),name:pick(F)+' '+pick(L),side:R()<.5?'Novia':'Novio',group,rsvp,diet,table:null,
      kind:group==='Familia'&&R()<.14?'niño':'adulto',plus:group!=='Familia'&&R()<.3,plusOf:null,token:tok(),
      phone:R()<.72?`+54 381 ${Math.floor(R()*5)+4}${Math.floor(R()*9)}${Math.floor(R()*9)}-${String(Math.floor(R()*9000)+1000)}`:''});
  }
  if(sp.p>.5){
    const conf=w.guests.filter(g=>g.rsvp==='si').sort((a,b)=>(a.side+a.group).localeCompare(b.side+b.group));
    conf.slice(0,conf.length-6).forEach((g,i)=>g.table=Math.min(w.tables,Math.floor(i/10)+1));
  }
  /* vendors */
  const V=[
    ['Salón / lugar',.22,[sp.venue]],
    ['Catering',.30,['Sabores del Norte Catering','La Mesa de Clara','Cocina Aconquija']],
    ['Fotografía y video',.10,['Luz de Cerro Estudio','Ana Paz Fotografía']],
    ['DJ / Música',.07,['DJ Fran Herrera','Sonido Aconquija','Banda Los del Parque']],
    ['Ambientación y flores',.09,['Flor de Lapacho','Verde Menta Deco']],
    ['Vestido y traje',.08,['Atelier Belén Ruiz']],
    ['Torta y mesa dulce',.03,['Dulce Tafí Pastelería']],
    ['Peinado y maquillaje',.02,['Studio Aurora']],
    ['Invitaciones',.02,['Papel & Tinta']],
    ['Transporte',.02,['Traslados Norte VIP']],
  ];
  const cont=['Mariela','Gustavo','Carla','Nicolás','Verónica','Andrés','Laura'];
  V.forEach(([cat,frac,names],i)=>{
    const lvl=Math.max(0,Math.min(4,Math.round(sp.p*5.4-i*.45+(R()-.5))));
    const amount=Math.round(sp.budget*frac*(.9+R()*.2)/1000)*1000;
    const v={id:uid(),name:pick(names),cat,contact:pick(cont),phone:`+54 381 4${Math.floor(R()*9)}${Math.floor(R()*9)}-${String(Math.floor(R()*9000)+1000)}`,status:VSTAT[lvl],amount};
    w.vendors.push(v);
    if(lvl>=2){
      const paid=lvl===2?0:lvl===3?Math.round(amount*(.3+R()*.2)/1000)*1000:Math.round(amount*(.5+R()*.5)/1000)*1000;
      const ex={id:uid(),concept:v.name,cat,vendorId:v.id,total:amount,paid:Math.min(paid,amount),due:addDays(date,-10),plan:[]};
      planPagos(ex,date);
      w.expenses.push(ex);
    }
  });
  w.expenses.push({id:uid(),concept:'Souvenirs para invitados',cat:'Otros',vendorId:null,total:Math.round(sp.target*6500/1000)*1000,paid:sp.p>.5?Math.round(sp.target*6500/1000)*1000:0,due:addDays(date,-20),plan:[]});
  /* tasks */
  const T=[['Reservar salón / lugar',300,'novios','Lugar'],['Definir lista preliminar de invitados',280,'novios','Invitados'],['Contratar fotógrafo y video',240,'planner','Proveedores'],['Degustación y elección de catering',210,'planner','Proveedores'],['Contratar DJ o banda',200,'planner','Proveedores'],['Enviar save the date',180,'novios','Invitados'],['Primera prueba de vestido',150,'novios','Novios'],['Definir ambientación y paleta',140,'planner','Deco'],['Contratar florista',120,'planner','Proveedores'],['Enviar invitaciones con RSVP',90,'planner','Invitados'],['Reservar alojamiento para invitados de afuera',80,'planner','Logística'],['Elegir menú final',60,'novios','Catering'],['Armar lista de canciones',45,'novios','Música'],['Cerrar confirmaciones RSVP',30,'planner','Invitados'],['Armar plano de mesas',21,'planner','Invitados'],['Confirmar horarios con proveedores',14,'planner','Logística'],['Pagar saldos pendientes',10,'novios','Pagos'],['Prueba de peinado y maquillaje',7,'novios','Novios'],['Ensayo de ceremonia',2,'planner','Ceremonia'],['Preparar kit de emergencia del día',1,'planner','Día D']];
  let skipped=0;
  T.forEach(([title,off,owner,cat])=>{
    const due=addDays(date,-off); const past=daysUntil(due)<0;
    let done=past; if(past&&daysUntil(due)>-45&&skipped<2&&R()<.5){done=false;skipped++}
    if(!past&&daysUntil(due)<20&&R()<.3)done=true;
    w.tasks.push({id:uid(),title,due,owner,cat,done});
  });
  /* bitácora y reuniones */
  const hoy=fmtISO(today0());
  if(sp.p>0){
    [[-2,'WhatsApp','Consulta por la ambientación','Preguntaron si se puede sumar una alfombra al pasillo de la ceremonia. Lo veo con deco.'],
     [-9,'Reunión','Reunión de avance','Repasamos catering y música. Quedó pendiente definir la mesa dulce.'],
     [-24,'Mail','Envío de presupuestos','Mandé dos opciones de fotografía. Lo piensan hasta la semana que viene.'],
     [-48,'Llamada','Cierre de la lista de invitados','Confirmaron el número final para empezar a armar las mesas.']
    ].slice(0,Math.max(1,Math.round(sp.p*4))).forEach(([off,kind,title,body])=>w.log.push({id:uid(),date:addDays(hoy,off),kind,title,body}));
    [[-18,'10:30','Reunión de avance','Oficina del estudio','Reunión'],
     [-5,'17:30','Degustación del menú','Salón del catering','Degustación'],
     [6,'11:00','Visita técnica al lugar',sp.venue,'Visita al lugar'],
     [19,'16:00','Prueba de vestido','Atelier Belén Ruiz','Prueba de vestido']
    ].forEach(([off,time,title,place,kind])=>{
      const d=addDays(hoy,off);
      if(daysUntil(d)>daysUntil(date))return;
      w.meetings.push({id:uid(),date:d,time,title,place,kind,done:daysUntil(d)<0});
    });
  }
  w.meetings.push({id:uid(),date:addDays(date,-2),time:'18:00',title:'Ensayo de ceremonia',place:sp.venue,kind:'Ensayo',done:daysUntil(addDays(date,-2))<0});
  if(sp.p>.5)w.docs=[
    {id:uid(),name:'Contrato firmado con el estudio',kind:'Contrato',url:'https://drive.google.com/',date:w.contract.signed||hoy},
    {id:uid(),name:'Plano del salón',kind:'Plano',url:'https://drive.google.com/',date:addDays(hoy,-30)},
    {id:uid(),name:'Moodboard de ambientación',kind:'Moodboard',url:'https://drive.google.com/',date:addDays(hoy,-45)}];
  /* timeline */
  w.timeline=[['16:30','Llegada de la planner y proveedores',sp.venue,'Planner',0],['18:00','Fotos de preparativos','Habitación de novios','Fotografía',0],['19:30','Ceremonia',sp.venue+' — jardín','Todos',1],['20:15','Cóctel de bienvenida','Galería','Catering',0],['21:30','Entrada al salón','Salón principal','DJ',1],['22:00','Cena','Salón principal','Catering',0],['23:30','Vals y primer baile','Pista','DJ',1],['00:00','Arranca la fiesta','Pista','DJ',0],['02:30','Torta y mesa dulce','Salón principal','Pastelería',0],['04:30','Fin de fiesta y traslados','Entrada','Transporte',0]]
    .map(([time,title,place,who,key])=>({id:uid(),time,title,place,who,key:!!key}));
  return w;
}

/* ================= state ================= */
const KEY='alianza-demo-v1';
let S; try{S=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){S=null}
S=(!S||!S.weddings)?seed():migrate(S);
/* datos guardados de una versión anterior: completamos lo que falta en vez de borrarlos */
function migrate(S){
  const v=S.v||1;
  if(v<2)S.weddings.forEach(w=>{
    const half=String(w.couple||'').split('&');
    w.slug=w.slug||slugify(w.couple);
    w.status=w.status||(daysUntil(w.date)<0?'finalizada':'activa');
    w.partners=w.partners||[{id:uid(),role:'Novia',name:(half[0]||'').trim(),phone:'',email:'',ig:''},
                            {id:uid(),role:'Novio',name:(half[1]||'').trim(),phone:'',email:'',ig:''}];
    w.profile=w.profile||{how:'',palette:'',song:'',witnesses:'',address:'',notes:''};
    w.contract=w.contract||makeContract({plan:'Full planning',p:0},w.date,Math.round((w.budget||0)*FEE_RATE/1000)*1000);
    w.log=w.log||[];w.meetings=w.meetings||[];
    (w.guests||[]).forEach(g=>{g.kind=g.kind||'adulto';g.plus=!!g.plus;g.plusOf=g.plusOf||null});
  });
  if(v<3)S.weddings.forEach(w=>{
    w.messages=w.messages||[];
    w.profile.faq=w.profile.faq||{dress:'',gifts:'',kids:'',lodging:'',transport:'',extra:''};
    (w.guests||[]).forEach(g=>{if(g.phone===undefined)g.phone=''});
  });
  if(v<4)S.weddings.forEach(w=>{
    w.docs=w.docs||[];
    w.tableMeta=w.tableMeta||[];
    (w.expenses||[]).forEach(e=>{e.plan=e.plan||[]});
  });
  /* v5: link personal por invitado (#rsvp/<slug>/<token>) */
  S.weddings.forEach(w=>(w.guests||[]).forEach(g=>{
    if(!g.token)g.token=tok();
    if(g.kind===undefined)g.kind='adulto';
    if(g.plus===undefined)g.plus=false;
    if(g.plusOf===undefined)g.plusOf=null;
    if(g.phone===undefined)g.phone='';
  }));
  S.v=5;return S;
}
const AL=()=>window.Alianza||{};
const API=()=>!!AL().enabled;
const isCouple=()=>API()&&AL().user&&AL().user.role==='novios';
/* con backend la verdad es el servidor: no se deja una copia de las bodas reales en el navegador */
const save=()=>{if(!API()){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
  try{AL().push&&AL().push(S)}catch(e){}};
const active=()=>S.weddings.filter(w=>w.status==='activa');
const leads=()=>S.weddings.filter(w=>w.status==='lead');
const archived=()=>S.weddings.filter(w=>w.status==='finalizada');
const ui={view:'planner',scope:'studio',wid:(active()[0]||S.weddings[0]).id,tab:'resumen',gFilter:'todos',gQuery:'',
  tOwner:'todos',focus:null,rsvp:null,rsvpQuery:'',rsvpGuest:null,rsvpDone:false,showArchive:false,
  msgT:null,msgBody:null,botLog:[],expOpen:null,pub:null,rsvpByToken:false,rsvpOpened:false};
/* #rsvp/<slug>            link general (demo)
   #rsvp/<slug>/<id boda>  link general
   #rsvp/<slug>/<token>    link personal del invitado: entra directo a su respuesta */
function route(){
  let h=location.hash.replace('#','');try{h=decodeURIComponent(h)}catch(e){}
  ui.rsvp=null;
  if(h.indexOf('rsvp/')===0){
    const [slug,key]=h.slice(5).split('/');
    if(API()){
      const k=key||slug;
      if(!ui.pub||ui.pub.key!==k){ui.pub={key:k,loading:true};ui.rsvpGuest=null;ui.rsvpDone=false;ui.rsvpByToken=false;ui.rsvpQuery='';loadPublic()}
      ui.rsvp='remote';return;
    }
    const w=(key&&(S.weddings.find(x=>x.id===key)||S.weddings.find(x=>x.guests.some(g=>g.token===key))))||S.weddings.find(x=>x.slug===slug);
    if(!w||w.status==='lead'){ui.rsvp='missing';return}
    ui.rsvp=w.id;
    const g=key&&w.guests.find(x=>x.token===key&&!x.plusOf);
    if(g&&ui.rsvpGuest!==g.id){ui.rsvpGuest=g.id;ui.rsvpByToken=true;ui.rsvpDone=g.rsvp!=='pendiente'}
    return;
  }
  if(h==='portal'){ui.view='portal';ui.scope='wedding'}
}
route();
window.addEventListener('hashchange',()=>{route();render();scrollTo(0,0)});
const W=()=>S.weddings.find(w=>w.id===ui.wid)||S.weddings[0];
/* cada mesa puede tener nombre propio y capacidad distinta */
const mesaInfo=(w,n)=>{const m=(w.tableMeta||[])[n-1]||{};return {name:m.name||`Mesa ${n}`,seats:m.seats||10}};
const setMesa=(w,n,data)=>{w.tableMeta=w.tableMeta||[];while(w.tableMeta.length<n)w.tableMeta.push({});
  w.tableMeta[n-1]={...w.tableMeta[n-1],...data}};

/* ================= derived ================= */
function stats(w){
  const inv=w.guests.length, si=w.guests.filter(g=>g.rsvp==='si').length, no=w.guests.filter(g=>g.rsvp==='no').length;
  const committed=sum(w.expenses,e=>e.total), paid=sum(w.expenses,e=>e.paid);
  const tasksDone=w.tasks.filter(t=>t.done).length;
  const overdue=w.tasks.filter(t=>!t.done&&daysUntil(t.due)<0).length;
  const payDue=w.expenses.filter(e=>e.paid<e.total&&daysUntil(e.due)<=15).length;
  const vConf=w.vendors.filter(v=>v.status==='confirmado').length;
  const pendAppr=w.vendors.filter(v=>v.status==='presupuestado').length;
  return {inv,si,no,pend:inv-si-no,committed,paid,tasksDone,overdue,payDue,vConf,pendAppr,days:daysUntil(w.date),
    diet:w.guests.filter(g=>g.rsvp==='si'&&g.diet).length, seated:w.guests.filter(g=>g.rsvp==='si'&&g.table).length};
}

/* honorarios del estudio (lo que cobra la planner, aparte del presupuesto de la boda) */
function fees(w){
  const ins=(w.contract&&w.contract.installments)||[];
  const fee=ins.length?sum(ins,i=>i.amount):((w.contract&&w.contract.fee)||0);
  const charged=sum(ins.filter(i=>i.paid),i=>i.amount);
  const next=ins.filter(i=>!i.paid).sort((a,b)=>a.due.localeCompare(b.due))[0]||null;
  const late=ins.filter(i=>!i.paid&&daysUntil(i.due)<0).length;
  return {fee,charged,pending:fee-charged,next,late};
}

/* ================= exportar ================= */
/* Excel en es-AR abre bien con punto y coma y BOM */
const csv=rows=>rows.map(r=>r.map(c=>{const v=String(c==null?'':c);
  return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(';')).join('\r\n');
function download(name,text){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}));
  a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
const fileName=(w,what)=>`${slugify(w.couple)}-${what}-${fmtISO(today0())}.csv`;

/* ================= render ================= */
const app=document.getElementById('app');
/* la animación de entrada acompaña los cambios de vista, no cada click:
   render() redibuja todo, así que sólo se marca cuando cambia la vista o el tab */
let lastView=null,lastTab=null;
function render(){
  if(ui.rsvp){app.className='app public';app.innerHTML=rsvpPage();restoreFocus();return}
  if(ui.booting){app.className='app solo';app.innerHTML=bootScreen();return}
  if(isCouple()){ui.scope='wedding';ui.view='portal';if(AL().user.weddingId)ui.wid=AL().user.weddingId;
    if(!S.weddings.length){app.className='app solo';app.innerHTML=`<main class="main">${mobileBar()}<div class="panel"><div class="empty">Tu planner todavía no cargó tu boda. Cuando lo haga, la vas a ver acá.</div></div></main>`;paintSync();return}}
  app.className=isCouple()?'app solo':'app';
  const body=ui.scope==='studio'?studio():ui.scope==='leads'?leadsView():ui.scope==='negocio'?negocio():wedding();
  const view=ui.scope+(ui.scope==='wedding'?'|'+ui.wid+'|'+ui.view:''), tab=view+'|'+ui.tab;
  const enter=view!==lastView?'enter-view':tab!==lastTab?'enter-tab':'';
  if(lastView&&view!==lastView)scrollTo(0,0);
  lastView=view;lastTab=tab;
  app.innerHTML=(isCouple()?'':sidebar())+`<main class="main ${enter}" id="main">${mobileBar()}${body}</main>`;
  paintSync();
  restoreFocus();
}
function restoreFocus(){
  if(!ui.focus)return;
  const el=document.getElementById(ui.focus);
  if(el){el.focus();const v=el.value;try{el.setSelectionRange(v.length,v.length)}catch(e){}}
}
function bootScreen(){
  return `<div class="boot" role="status">${ic('rings','boot-ic')}<span>Trayendo tus bodas…</span></div>`;
}

/* ---------- estado de guardado (sólo con backend) ---------- */
const SYNC={
  saved:['ok','Guardado'],pending:['busy','Guardando…'],saving:['busy','Guardando…'],idle:['busy','Conectando…'],
  offline:['warn','Sin conexión · reintentando'],error:['bad','No se pudo guardar'],
  conflict:['warn','Hay una boda con cambios de otra sesión'],auth:['warn','La sesión venció'],
};
const syncSlot=(cls='')=>API()?`<div class="sync ${cls}" data-sync role="status" aria-live="polite"></div>`:'';
function paintSync(){
  const st=AL().status, [tone,label]=SYNC[st]||SYNC.saved, detail=AL().detail||'';
  document.querySelectorAll('[data-sync]').forEach(el=>{
    el.dataset.tone=tone;
    el.title=detail;
    el.innerHTML=`<i aria-hidden="true"></i><span>${esc(st==='saving'&&detail?detail:label)}</span>${tone==='bad'||st==='offline'?'<button class="linkbtn" data-a="sync-retry">Reintentar</button>':''}`;
  });
}

function sidebar(){
  const ls=leads(), arch=archived(), act=active();
  const byDate=a=>a.slice().sort((x,y)=>x.date.localeCompare(y.date));
  const item=w=>{const d=daysUntil(w.date), on=ui.scope==='wedding'&&ui.wid===w.id;return `
    <button class="witem ${on?'on':''}" data-a="open" data-id="${w.id}" ${on?'aria-current="page"':''}>
      <span class="n">${coupleHTML(w.couple)}</span>
      <span class="d">${fDate(w.date)} · ${esc(w.city)}</span>
      <span class="c">${w.status==='finalizada'?'✓':d<0?'—':d}<small>${w.status==='finalizada'?'lista':d===1?'día':'días'}</small></span>
    </button>`};
  const nav=(k,icon,label,extra='')=>`<button class="studio-btn ${ui.scope===k?'on':''}" data-a="${k}" ${ui.scope===k?'aria-current="page"':''}>${ic(icon)}<span>${label}</span>${extra}</button>`;
  const u=AL().user;
  return `<aside class="side">
    <div class="brand">${ic('rings','brand-ic')}<b>Alianza</b><span>wedding studio</span></div>
    <nav class="navblock" aria-label="Estudio">
      ${nav('studio','agenda','Agenda del estudio')}
      ${nav('leads','inbox','Consultas',ls.length?`<span class="cnt">${ls.length}</span>`:'')}
      ${nav('negocio','chart','El negocio')}
    </nav>
    <div>
      <h4>Bodas en curso</h4>
      <div class="wlist">${byDate(act).map(item).join('')||'<p class="muted side-empty">Ninguna boda activa.</p>'}</div>
    </div>
    ${arch.length?`<div>
      <h4><button class="linkbtn side-toggle" data-a="archive" aria-expanded="${ui.showArchive}">Archivo · ${arch.length} ${ic('chev',ui.showArchive?'open':'')}</button></h4>
      ${ui.showArchive?`<div class="wlist">${byDate(arch).reverse().map(item).join('')}</div>`:''}
    </div>`:''}
    <div class="side-foot">
      ${syncSlot()}
      ${API()?`<span class="who">${esc(u?u.name:'')}</span><button class="linkbtn" data-a="logout">${ic('out')} Cerrar sesión</button>`
      :`<span>Demo de portfolio · datos ficticios</span>
      <span>Los cambios se guardan en este navegador.</span>
      <button class="linkbtn" data-a="reset">Restablecer datos de ejemplo</button>`}
    </div>
  </aside>`;
}
function mobileBar(){
  if(isCouple())return `<div class="mobile-bar couple-bar"><div class="brand">${ic('rings','brand-ic')}<b>Alianza</b></div>${syncSlot()}<button class="btn sm ghost" data-a="logout">${ic('out')} Salir</button></div>`;
  const grp=(label,list)=>list.length?`<optgroup label="${label}">${list.map(w=>`<option value="${w.id}" ${ui.scope==='wedding'&&ui.wid===w.id?'selected':''}>${esc(w.couple)} · ${fDate(w.date)}</option>`).join('')}</optgroup>`:'';
  const opts=[`<option value="studio" ${ui.scope==='studio'?'selected':''}>Agenda del estudio</option>`,
    `<option value="leads" ${ui.scope==='leads'?'selected':''}>Consultas (${leads().length})</option>`,
    `<option value="negocio" ${ui.scope==='negocio'?'selected':''}>El negocio</option>`,
    grp('Bodas en curso',active()),grp('Archivo',archived())];
  return `<div class="mobile-bar"><div class="brand">${ic('rings','brand-ic')}<b>Alianza</b></div><select class="select" id="mselect" data-c="mselect" aria-label="Elegir boda">${opts.join('')}</select>${syncSlot('compact')}</div>`;
}

/* ---------- studio overview ---------- */
function studio(){
  const ws=active().slice().sort((a,b)=>a.date.localeCompare(b.date));
  const ls=leads(), nd=parse(fmtISO(today0()));
  const head=`<div class="head"><div>
    <h1 class="couple">Temporada ${nd.getFullYear()}–${nd.getFullYear()+1}</h1>
    <div class="meta"><span class="meta-lead">Hoy, ${DIAS[nd.getDay()]} ${nd.getDate()} de ${MESL[nd.getMonth()]}</span><span>${ws.length} bodas activas</span><span>${sum(ws,w=>w.guests.length)} invitados en total</span>${ls.length?`<span><button class="linkbtn" data-a="leads">${ls.length} consultas sin cerrar</button></span>`:''}</div>
  </div>
  <div class="row"><button class="btn" data-a="new-lead">+ Consulta</button><button class="btn pri" data-a="new-wedding">+ Nueva boda</button></div></div>`;
  if(!ws.length) return head+`<div class="panel"><div class="empty">No hay bodas en curso. Creá una nueva o convertí una consulta en boda.</div></div>`;

  const all=ws.map(w=>({w,s:stats(w),f:fees(w)}));
  const tot=sum(all,x=>x.s.committed), paid=sum(all,x=>x.s.paid);
  const feeTot=sum(all,x=>x.f.fee), feeGot=sum(all,x=>x.f.charged);
  const alerts=sum(all,x=>x.s.overdue+x.s.payDue+x.f.late);

  /* todo lo que vence en 30 días, en todas las bodas */
  const upcoming=[];
  ws.forEach(w=>{
    w.tasks.filter(t=>!t.done&&daysUntil(t.due)<=30).forEach(t=>upcoming.push({w,kind:'task',title:t.title,due:t.due,owner:t.owner}));
    w.expenses.filter(e=>e.paid<e.total&&daysUntil(e.due)<=30).forEach(e=>upcoming.push({w,kind:'pay',title:'Saldo '+e.concept,due:e.due,amt:e.total-e.paid}));
    w.meetings.filter(m=>!m.done&&daysUntil(m.date)<=30).forEach(m=>upcoming.push({w,kind:'meet',title:m.title,due:m.date,time:m.time,place:m.place}));
    w.contract.installments.filter(i=>!i.paid&&daysUntil(i.due)<=30).forEach(i=>upcoming.push({w,kind:'fee',title:'Cobrar '+i.label.toLowerCase(),due:i.due,amt:i.amount}));
  });
  upcoming.sort((a,b)=>a.due.localeCompare(b.due));
  const sub={task:u=>u.owner==='novios'?'A cargo de los novios':'A cargo de la planner',
    pay:u=>'Pago a proveedor · '+money(u.amt),
    meet:u=>`${u.time} h · ${u.place}`,
    fee:u=>'Honorarios del estudio · '+money(u.amt)};

  return head+`
  <div class="grid g4" style="margin-bottom:16px">
    ${kpi('Próxima boda',`${all[0].s.days}<small> días</small>`,esc(all[0].w.couple))}
    ${kpi('Presupuestos gestionados',moneyK(sum(ws,w=>w.budget)),`${moneyK(tot)} comprometido · ${pct(paid,tot)}% pagado`,pct(paid,tot))}
    ${kpi('Honorarios cobrados',`${pct(feeGot,feeTot)}<small> %</small>`,`${moneyK(feeGot)} de ${moneyK(feeTot)} de la temporada`,pct(feeGot,feeTot))}
    ${kpi('Requieren atención',`${alerts}`,alerts?'Tareas vencidas, saldos y cobros':'Todo al día')}
  </div>

  <div class="grid g2" style="margin-bottom:16px">
    ${all.map(({w,s,f})=>`
    <article class="wcard" data-a="open" data-id="${w.id}" tabindex="0">
      <div class="top"><div>
        <div class="nm">${coupleHTML(w.couple)}</div>
        <div class="muted" style="font-size:12.5px;margin-top:4px">${fLong(w.date)}<br>${esc(w.venue)}, ${esc(w.city)}</div>
      </div><div class="count"><b>${s.days}</b><span>días</span></div></div>
      <div class="minirows">
        <span>Invitados</span><div class="bar"><i style="width:${pct(s.si,s.inv)}%"></i></div><span class="num">${s.si}/${s.inv}</span>
        <span>Checklist</span><div class="bar"><i style="width:${pct(s.tasksDone,w.tasks.length)}%"></i></div><span class="num">${pct(s.tasksDone,w.tasks.length)}%</span>
        <span>Pagos</span><div class="bar"><i style="width:${pct(s.paid,s.committed)}%"></i></div><span class="num">${pct(s.paid,s.committed)}%</span>
        <span>Honorarios</span><div class="bar blush"><i style="width:${pct(f.charged,f.fee)}%"></i></div><span class="num">${pct(f.charged,f.fee)}%</span>
      </div>
      <div class="alerts">
        ${s.overdue?`<span class="pill bad">${s.overdue} tarea${s.overdue>1?'s':''} vencida${s.overdue>1?'s':''}</span>`:''}
        ${s.payDue?`<span class="pill warn">${s.payDue} pago${s.payDue>1?'s':''} por vencer</span>`:''}
        ${f.late?`<span class="pill bad">${f.late} cobro${f.late>1?'s':''} atrasado${f.late>1?'s':''}</span>`:''}
        ${s.pendAppr?`<span class="pill acc">${s.pendAppr} presupuesto${s.pendAppr>1?'s':''} esperando a los novios</span>`:''}
        ${!s.overdue&&!s.payDue&&!s.pendAppr&&!f.late?'<span class="pill ok">Al día</span>':''}
        <span class="pill plain">${esc(w.contract.plan)}</span>
      </div>
    </article>`).join('')}
  </div>

  <div class="grid g2">
    <div class="panel"><h3>Próximos 30 días en todas las bodas <small>${upcoming.length} pendientes</small></h3>
      <div class="list">${upcoming.slice(0,14).map(u=>{const d=daysUntil(u.due);return `
        <div class="li">${dateTile(u.due)}
          <div><div class="t">${esc(u.title)}</div><div class="sub">${esc(u.w.couple)} · ${sub[u.kind](u)}</div></div>
          ${d<0?`<span class="pill bad">Vencida hace ${-d} d</span>`:d<=7?`<span class="pill warn">${d===0?'Hoy':'En '+d+' d'}</span>`:`<span class="pill">En ${d} d</span>`}
        </div>`}).join('')||'<div class="empty">Nada pendiente en los próximos 30 días.</div>'}</div>
    </div>
    <div class="panel"><h3>Facturación del estudio <small>${moneyK(feeTot-feeGot)} por cobrar</small></h3>
      <div class="list">${all.map(({w,f})=>`
        <div class="li" style="grid-template-columns:1fr auto">
          <div><div class="t">${esc(w.couple)}</div>
            <div class="sub">${esc(w.contract.plan)} · ${f.next?`próximo cobro ${f.next.label.toLowerCase()} el ${fDate(f.next.due)}`:'todo cobrado'}</div>
            <div class="bar" style="max-width:220px"><i style="width:${pct(f.charged,f.fee)}%"></i></div></div>
          <div style="text-align:right"><div class="num">${moneyK(f.charged)}</div><div class="sub">de ${moneyK(f.fee)}</div></div>
        </div>`).join('')}</div>
      <p class="muted" style="font-size:12px;margin:12px 0 0">Honorarios de la planner. No se mezclan con el presupuesto de cada boda.</p>
    </div>
  </div>`;
}

/* ---------- el negocio del estudio ---------- */
function negocio(){
  const ws=S.weddings.filter(w=>w.status!=='lead'), ls=leads();
  const F=ws.map(w=>fees(w));
  const total=sum(F,f=>f.fee), cobrado=sum(F,f=>f.charged);
  const ticket=ws.length?total/ws.length:0;
  /* ingresos por mes, mirando todas las cuotas de todos los contratos */
  const meses={};
  ws.forEach(w=>w.contract.installments.forEach(i=>{
    const k=i.due.slice(0,7);
    meses[k]=meses[k]||{cobrado:0,pendiente:0};
    meses[k][i.paid?'cobrado':'pendiente']+=i.amount;
  }));
  const keys=Object.keys(meses).sort();
  const max=Math.max(1,...keys.map(k=>meses[k].cobrado+meses[k].pendiente));
  const mesLabel=k=>{const [y,m]=k.split('-');return `${MES[+m-1]} ${y.slice(2)}`};
  const cartera=[['En curso',active().length,'ok'],['Consultas',ls.length,'acc'],['Finalizadas',archived().length,'plain']];
  return `<div class="head"><div>
      <h1 class="couple">Números del estudio</h1>
      <div class="meta"><span>${ws.length} bodas contratadas</span><span>${ls.length} consultas abiertas</span></div>
    </div></div>
  <div class="grid g4" style="margin-bottom:16px">
    ${kpi('Honorarios contratados',moneyK(total),`${ws.length} bodas`)}
    ${kpi('Cobrado',moneyK(cobrado),`${pct(cobrado,total)}% del total`,pct(cobrado,total))}
    ${kpi('Por cobrar',moneyK(total-cobrado),(()=>{const late=sum(ws,w=>fees(w).late);return late?`${late} cuotas atrasadas`:'Sin atrasos'})())}
    ${kpi('Ticket promedio',moneyK(ticket),'Honorarios por boda')}
  </div>
  <div class="grid g2">
    <div class="panel"><h3>Ingresos por mes</h3>
      <div class="legend"><span><i style="background:var(--accent)"></i>Cobrado</span><span><i style="background:var(--accent-soft);border:1px solid var(--line)"></i>Por cobrar</span></div>
      <div class="cats">${keys.map(k=>{const m=meses[k],t=m.cobrado+m.pendiente;return `<div class="cat">
        <div class="top"><span>${mesLabel(k)}</span><span class="num">${moneyK(t)}</span></div>
        <div class="stack" style="width:${Math.max(8,t/max*100)}%"><i class="p" style="width:${pct(m.cobrado,t)}%"></i><i class="c" style="flex:1"></i></div>
      </div>`}).join('')||'<div class="empty">Todavía no hay cuotas cargadas.</div>'}</div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel"><h3>Cartera</h3>
        <div class="minirows">
          ${cartera.map(([l,n,c])=>`<span>${l}</span><div class="bar"><i style="width:${pct(n,S.weddings.length)}%"></i></div><b class="num">${n}</b>`).join('')}
        </div>
        <p class="muted" style="font-size:12px;margin:12px 0 0">${ls.length?`Si cerrás las ${ls.length} consultas abiertas sumás ${moneyK(sum(ls,w=>fees(w).fee))} en honorarios.`:'No hay consultas abiertas.'}</p>
      </div>
      <div class="panel"><h3>Por boda</h3>
        <div class="list">${ws.slice().sort((a,b)=>fees(b).fee-fees(a).fee).map(w=>{const f=fees(w);return `
          <div class="li" style="grid-template-columns:1fr auto">
            <div><div class="t">${esc(w.couple)}</div><div class="sub">${esc(w.contract.plan)} · presupuesto ${moneyK(w.budget)} · ${w.guests.length} invitados</div></div>
            <span class="num">${moneyK(f.fee)}</span></div>`}).join('')||'<div class="empty">Sin bodas contratadas.</div>'}</div>
      </div>
    </div>
  </div>`;
}

/* ---------- consultas (leads) ---------- */
function partnerRows(w){
  return `<div class="prow">${w.partners.map(pn=>`<div class="pcard">
    <div class="pr">${esc(pn.role)}</div><b>${esc(pn.name||'Sin nombre')}</b>
    <div class="pd">${pn.phone?`<span class="num" style="user-select:all">${esc(pn.phone)}</span>`:'<span class="muted">Sin teléfono</span>'}</div>
    <div class="pd">${pn.email?`<span style="user-select:all">${esc(pn.email)}</span>`:'<span class="muted">Sin mail</span>'}</div>
    ${pn.ig?`<div class="pd muted">${esc(pn.ig)}</div>`:''}
  </div>`).join('')}</div>`;
}
function leadsView(){
  const ls=leads().slice().sort((a,b)=>b.lead.first.localeCompare(a.lead.first));
  const pot=sum(ls,w=>fees(w).fee);
  return `<div class="head"><div>
    <h1 class="couple">Parejas por confirmar</h1>
    <div class="meta"><span>${ls.length} consultas abiertas</span><span>${moneyK(pot)} en honorarios potenciales</span></div>
  </div><button class="btn pri" data-a="new-lead">+ Nueva consulta</button></div>
  <div class="grid g2">${ls.map(w=>{const d=-daysUntil(w.lead.first);return `
    <article class="panel lead">
      <div class="ltop">
        <div><div class="nm">${coupleHTML(w.couple)}</div>
          <div class="muted" style="font-size:12.5px;margin-top:4px">Fecha tentativa: ${fLong(w.date)}<br>${esc(w.city)} · ${w.target} invitados · presupuesto estimado ${moneyK(w.budget)}</div></div>
        <span class="pill ${d>14?'warn':'acc'}">${d===0?'Hoy':`Hace ${d} d`}</span>
      </div>
      ${partnerRows(w)}
      <div class="chips"><span class="pill plain">Llegó por ${esc(w.lead.source)}</span><span class="pill plain">Honorarios estimados ${moneyK(fees(w).fee)}</span></div>
      ${w.log.length?`<p class="lnote">${esc(w.log[0].body)}</p>`:''}
      <div class="row" style="flex-wrap:wrap">
        <button class="btn sm ghost" data-a="drop-lead" data-id="${w.id}">Descartar</button>
        <span class="sp" style="flex:1"></span>
        <button class="btn sm" data-a="open" data-id="${w.id}">Ver ficha</button>
        <button class="btn sm pri" data-a="convert" data-id="${w.id}">Convertir en boda</button>
      </div>
    </article>`}).join('')||'<div class="panel"><div class="empty">No hay consultas abiertas. Cuando entre una nueva pareja, cargala acá antes de que sea una boda.</div></div>'}</div>`;
}
function kpi(l,v,s,bar){return `<div class="panel kpi"><div class="l">${l}</div><div class="v">${v}</div>${bar!=null?`<div class="bar"><i style="width:${bar}%"></i></div>`:''}<div class="s">${s}</div></div>`}
function dateTile(s){const d=parse(s);return `<div class="date-tile"><b>${d.getDate()}</b><span>${MES[d.getMonth()]}</span></div>`}

/* ---------- wedding ---------- */
const TABS=[['resumen','Resumen'],['pareja','Pareja'],['invitados','Invitados'],['mesas','Mesas'],['presupuesto','Presupuesto'],['proveedores','Proveedores'],['checklist','Checklist'],['dia','Día D'],['mensajes','Mensajes']];
function wedding(){
  const w=W(), s=stats(w);
  const seg=`<div class="seg" aria-label="Vista">
      <button class="${ui.view==='planner'?'on':''}" data-a="view" data-v="planner">Vista planner</button>
      <button class="${ui.view==='portal'?'on':''}" data-a="view" data-v="portal">Portal novios</button>
    </div>`;
  if(ui.view==='portal') return (isCouple()?'':`<div class="head portal-head"><p class="portal-note">Así ven ${esc(w.couple)} su boda: sólo lo que les toca decidir o hacer. Vos seguís gestionando todo desde la vista planner.</p>${seg}</div>`)+portal(w,s);
  const lead=w.status==='lead'?'Consulta · todavía no es una boda'
    :w.status==='finalizada'?'Boda finalizada'
    :s.days<0?`Fue hace ${-s.days} días`:`Boda · faltan ${s.days} días`;
  const acts=w.status==='lead'?`<button class="btn pri" data-a="convert" data-id="${w.id}">Convertir en boda</button>`
    :w.status==='activa'&&s.days<=0?`<button class="btn" data-a="close-wedding" data-id="${w.id}">Cerrar y archivar</button>`
    :w.status==='finalizada'?`<button class="btn" data-a="reopen" data-id="${w.id}">Reabrir</button>`:'';
  const header=`<div class="head"><div>
      <h1 class="couple">${coupleHTML(w.couple)}</h1>
      <div class="meta"><span class="meta-lead">${lead}</span><span>${fLong(w.date)}</span><span>${esc(w.venue)}, ${esc(w.city)}</span><span>${esc(w.style)}</span><span class="pill ${w.status==='lead'?'acc':w.status==='finalizada'?'ok':'plain'}">${WSTATUS[w.status]}</span></div>
    </div><div class="row">${acts}${w.status==='lead'?'':seg}</div></div>`;
  const counts={invitados:s.pend,proveedores:s.pendAppr,checklist:s.overdue,pareja:fees(w).late};
  const tabs=w.status==='lead'?[['pareja','Ficha de la pareja'],['mensajes','Mensajes']]:TABS;
  const tab=tabs.some(t=>t[0]===ui.tab)?ui.tab:tabs[0][0];
  return header+`<nav class="tabs">${tabs.map(([k,l])=>`<button class="tab ${tab===k?'on':''}" data-a="tab" data-t="${k}">${l}${counts[k]?`<span class="cnt ${k==='checklist'||k==='pareja'?'alert':''}">${counts[k]}</span>`:''}</button>`).join('')}</nav>`+
    ({resumen,pareja,invitados,mesas,presupuesto,proveedores,checklist,dia,mensajes}[tab])(w,s);
}

function resumen(w,s){
  const next=w.tasks.filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6);
  const pays=w.expenses.filter(e=>e.paid<e.total).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5);
  return `<div class="grid g4" style="margin-bottom:16px">
    ${kpi('Cuenta regresiva',`${s.days}<small> días</small>`,fLong(w.date))}
    ${kpi('Confirmados',`${s.si}<small> / ${s.inv}</small>`,`${s.pend} pendientes · ${s.no} no vienen`,pct(s.si,s.inv))}
    ${kpi('Pagado',`${pct(s.paid,s.committed)}<small> %</small>`,`${moneyK(s.paid)} de ${moneyK(s.committed)}`,pct(s.paid,s.committed))}
    ${kpi('Checklist',`${s.tasksDone}<small> / ${w.tasks.length}</small>`,s.overdue?`<span style="color:var(--bad)">${s.overdue} vencidas</span>`:'Sin vencidas',pct(s.tasksDone,w.tasks.length))}
  </div>
  <div class="grid g2">
    <div class="panel"><h3>Próximas tareas <button class="btn sm ghost" data-a="tab" data-t="checklist">Ver checklist ${ic('right')}</button></h3>
      <div class="list">${next.map(t=>taskLi(t)).join('')||'<div class="empty">Checklist completo.</div>'}</div></div>
    <div class="grid" style="align-content:start">
      <div class="panel"><h3>Saldos pendientes <button class="btn sm ghost" data-a="tab" data-t="presupuesto">Presupuesto ${ic('right')}</button></h3>
        <div class="list">${pays.map(e=>`<div class="li">${dateTile(e.due)}<div><div class="t">${esc(e.concept)}</div><div class="sub">${esc(e.cat)} · pagado ${pct(e.paid,e.total)}%</div></div><span class="num">${money(e.total-e.paid)}</span></div>`).join('')||'<div class="empty">Todo pagado.</div>'}</div></div>
      <div class="panel"><h3>Proveedores</h3>
        <div class="chips">${VSTAT.map(st=>{const n=w.vendors.filter(v=>v.status===st).length;return `<span class="pill ${st==='confirmado'?'ok':st==='presupuestado'?'warn':st==='contactado'?'':'acc'}">${VLABEL[st]} · ${n}</span>`}).join('')}</div></div>
    </div>
  </div>`;
}
function taskLi(t){const d=daysUntil(t.due);return `<div class="li">${dateTile(t.due)}<div><div class="t">${esc(t.title)}</div><div class="sub">${esc(t.cat)} · ${t.owner==='novios'?'Novios':'Planner'}</div></div>${d<0?`<span class="pill bad">Vencida</span>`:`<span class="pill ${d<=7?'warn':''}">${d===0?'Hoy':'En '+d+' d'}</span>`}</div>`}

/* ---------- ficha de la pareja ---------- */
function pareja(w){
  const f=fees(w), P=w.profile, ins=w.contract.installments;
  const ms=w.meetings.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const pend=ms.filter(m=>!m.done), hechas=ms.filter(m=>m.done).reverse();
  const log=w.log.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const dd=(l,v)=>`<div class="dt">${l}</div><div class="dd">${v?esc(v):'<span class="muted">Sin cargar</span>'}</div>`;
  const meetLi=m=>{const d=daysUntil(m.date);return `<div class="li">${dateTile(m.date)}
    <div><div class="t">${esc(m.title)}</div><div class="sub">${esc(m.time)} h · ${esc(m.place||'A definir')} · ${esc(m.kind)}</div></div>
    <div class="row" style="gap:6px">
      ${m.done?'<span class="pill ok">Hecha</span>':d<0?`<span class="pill bad">Pasó hace ${-d} d</span>`:`<span class="pill ${d<=7?'warn':''}">${d===0?'Hoy':'En '+d+' d'}</span>`}
      ${m.done?'':`<button class="btn sm" data-a="meet-done" data-id="${m.id}">Listo</button>`}
      <button class="btn sm ghost" data-a="del-meet" data-id="${m.id}" aria-label="Quitar reunión">${ic('x')}</button>
    </div></div>`};

  return `<div class="grid g2" style="margin-bottom:16px">
    <div class="grid" style="align-content:start">
      <div class="panel"><h3>Los novios <button class="btn sm ghost" data-a="edit-partners">Editar contactos</button></h3>
        ${partnerRows(w)}
      </div>
      <div class="panel"><h3>Preguntas de los invitados <button class="btn sm ghost" data-a="edit-faq">Editar</button></h3>
        <p class="muted" style="font-size:12.5px;margin:-4px 0 12px">Esto es lo que responde el asistente en la página de confirmación. Lo cargás una vez y contesta solo.</p>
        <div class="dlist">
          ${dd('Vestimenta',P.faq.dress)}
          ${dd('Regalos',P.faq.gifts)}
          ${dd('Chicos',P.faq.kids)}
          ${dd('Alojamiento',P.faq.lodging)}
          ${dd('Traslados',P.faq.transport)}
          ${P.faq.extra?dd('Otros datos',P.faq.extra):''}
        </div>
        <div class="row" style="margin-top:12px"><button class="btn sm" data-a="open-rsvp">Ver la página del invitado</button></div>
      </div>
      <div class="panel"><h3>Sobre la pareja <button class="btn sm ghost" data-a="edit-profile">Editar</button></h3>
        <div class="dlist">
          ${dd('Cómo se conocieron',P.how)}
          ${dd('Paleta y estilo',P.palette||w.style)}
          ${dd('Canción del vals',P.song)}
          ${dd('Testigos',P.witnesses)}
          ${dd('Dirección de contacto',P.address)}
        </div>
        ${P.notes?`<p class="lnote" style="margin-top:12px">${esc(P.notes)}</p>`:''}
      </div>
    </div>

    <div class="panel"><h3>Contrato y honorarios del estudio <button class="btn sm ghost" data-a="edit-contract">Editar</button></h3>
      <div class="figs">
        <div><span class="fl">Honorarios</span><b class="fv num">${moneyK(f.fee)}</b><span class="fs">${esc(w.contract.plan)}</span></div>
        <div><span class="fl">Cobrado</span><b class="fv num">${moneyK(f.charged)}</b><span class="fs">${f.pending>0?`Resta ${moneyK(f.pending)}`:'Cobrado completo'}</span></div>
      </div>
      <div class="bar" style="margin-bottom:14px"><i style="width:${pct(f.charged,f.fee)}%"></i></div>
      <p class="muted" style="font-size:12.5px;margin:0 0 10px">${w.contract.signed?`Contrato firmado el ${fLong(w.contract.signed)}.`:'Contrato todavía sin firmar.'}</p>
      ${ins.length?`<div class="list">${ins.slice().sort((a,b)=>a.due.localeCompare(b.due)).map(i=>{const d=daysUntil(i.due);return `
        <div class="li">${dateTile(i.due)}
          <div><div class="t">${esc(i.label)}</div><div class="sub">${i.paid?`Cobrado el ${fDate(i.paidOn||i.due)}`:d<0?`Vencido hace ${-d} días`:`Vence en ${d} días`}</div></div>
          <div class="row" style="gap:8px"><span class="num">${money(i.amount)}</span>
          ${i.paid?'<span class="pill ok">Cobrado</span>':`<button class="btn sm pri" data-a="charge" data-id="${i.id}">Cobrar</button>`}</div>
        </div>`}).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn sm" data-a="add-installment">+ Cuota</button></div>`
      :`<div class="empty">Sin contrato cargado. Honorarios estimados: ${moneyK(f.fee)}.</div>
        <div class="row"><button class="btn pri" data-a="make-contract">Cargar contrato en 3 cuotas</button></div>`}
    </div>
  </div>

  <div class="grid g2">
    <div class="panel"><h3>Reuniones y visitas <button class="btn sm pri" data-a="add-meet">+ Reunión</button></h3>
      <div class="list">${pend.map(meetLi).join('')||'<div class="empty">No hay reuniones agendadas.</div>'}</div>
      ${hechas.length?`<details style="margin-top:12px"><summary class="muted" style="font-size:12.5px;cursor:pointer">Ya pasaron · ${hechas.length}</summary><div class="list">${hechas.map(meetLi).join('')}</div></details>`:''}
    </div>
    <div class="panel"><h3>Documentos <button class="btn sm pri" data-a="add-doc">+ Documento</button></h3>
      <div class="list">${w.docs.map(d=>`<div class="li" style="grid-template-columns:auto 1fr auto">${dateTile(d.date)}
        <div><div class="t">${safeUrl(d.url)?`<a href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener">${esc(d.name)}</a>`:`${esc(d.name)} <span class="muted">(link inválido)</span>`}</div><div class="sub">${esc(d.kind)}</div></div>
        <button class="btn sm ghost" data-a="del-doc" data-id="${d.id}" aria-label="Quitar documento">${ic('x')}</button></div>`).join('')
        ||'<div class="empty">Sin documentos. Guardá acá el link al contrato firmado, el plano del salón o el moodboard.</div>'}</div>
      <p class="muted" style="font-size:12px;margin:12px 0 0">Se guardan links, no archivos: el sistema todavía no tiene dónde alojarlos.</p>
    </div>
    <div class="panel"><h3>Bitácora <button class="btn sm pri" data-a="add-log">+ Nota</button></h3>
      <div class="list">${log.map(l=>`<div class="li" style="align-items:start">${dateTile(l.date)}
        <div><div class="t">${esc(l.title)}</div><div class="sub" style="margin-bottom:4px">${esc(l.kind)}</div><div class="lbody">${esc(l.body)}</div></div>
        <button class="btn sm ghost" data-a="del-log" data-id="${l.id}" aria-label="Borrar nota">${ic('x')}</button></div>`).join('')
        ||'<div class="empty">Todavía no registraste nada. Anotá acá cada llamada, reunión o pedido de los novios.</div>'}</div>
    </div>
  </div>`;
}

function invitados(w,s){
  const q=ui.gQuery.toLowerCase().trim();
  let list=w.guests.filter(g=>(ui.gFilter==='todos'||g.rsvp===ui.gFilter||(ui.gFilter==='dieta'&&g.diet))&&(!q||g.name.toLowerCase().includes(q)||g.group.toLowerCase().includes(q)));
  const f=[['todos','Todos',s.inv],['si','Confirmados',s.si],['pendiente','Pendientes',s.pend],['no','No vienen',s.no],['dieta','Menú especial',w.guests.filter(g=>g.diet).length]];
  return `<div class="toolbar">
    <div class="chips">${f.map(([k,l,n])=>`<button class="chip ${ui.gFilter===k?'on':''}" data-a="gfilter" data-f="${k}">${l}<span class="num">${n}</span></button>`).join('')}</div>
    <span class="sp"></span>
    <input class="input" id="gq" data-c="gq" placeholder="Buscar invitado o grupo" value="${esc(ui.gQuery)}" aria-label="Buscar invitado">
    <button class="btn" data-a="copy-rsvp">Copiar link RSVP</button>
    <button class="btn" data-a="open-rsvp">Ver como invitado</button>
    <button class="btn" data-a="export-guests">Exportar CSV</button>
    <button class="btn pri" data-a="add-guest">+ Invitado</button>
  </div>
  <div class="tablewrap"><table>
    <thead><tr><th>Nombre</th><th>Lado</th><th>Grupo</th><th>RSVP</th><th>Menú</th><th>Mesa</th><th></th></tr></thead>
    <tbody>${list.map(g=>`<tr>
      <td><b>${esc(g.name)}</b></td><td>${g.side}</td><td>${esc(g.group)}</td>
      <td><select class="tsel rsvp-sel" data-c="rsvp" data-id="${g.id}" aria-label="RSVP de ${esc(g.name)}" style="color:var(--${g.rsvp==='si'?'ok':g.rsvp==='no'?'bad':'warn'})">${Object.entries(RSVP).map(([k,l])=>`<option value="${k}" ${g.rsvp===k?'selected':''}>${l}</option>`).join('')}</select></td>
      <td>${g.diet?`<span class="pill acc plain">${g.diet}</span>`:'<span class="muted">Estándar</span>'}</td>
      <td>${g.rsvp==='si'?`<select class="tsel" data-c="table" data-id="${g.id}" aria-label="Mesa de ${esc(g.name)}"><option value="">Sin mesa</option>${Array.from({length:w.tables},(_,i)=>`<option value="${i+1}" ${g.table===i+1?'selected':''}>Mesa ${i+1}</option>`).join('')}</select>`:'<span class="muted">—</span>'}</td>
      <td class="r nowrap">${g.plusOf?'':`<button class="btn sm ghost" data-a="copy-glink" data-id="${g.id}" aria-label="Copiar el link personal de ${esc(g.name)}">Copiar link</button>`}<button class="btn sm ghost" data-a="del-guest" data-id="${g.id}" aria-label="Quitar a ${esc(g.name)}">Quitar</button></td>
    </tr>`).join('')||`<tr><td colspan="7"><div class="empty">Ningún invitado coincide con la búsqueda.</div></td></tr>`}</tbody>
  </table></div>
  <p class="muted" style="font-size:12px;margin-top:10px">${list.length} de ${s.inv} invitados · ${s.diet} confirmados con menú especial</p>`;
}

function mesas(w,s){
  const conf=w.guests.filter(g=>g.rsvp==='si');
  const un=conf.filter(g=>!g.table);
  const tables=Array.from({length:w.tables},(_,i)=>({n:i+1,gs:conf.filter(g=>g.table===i+1),...mesaInfo(w,i+1)}));
  const cupos=sum(tables,t=>t.seats);
  return `<div class="toolbar">
    <span class="pill ${un.length?'warn':'ok'}">${s.seated} de ${s.si} confirmados ubicados</span>
    <span class="muted" style="font-size:12.5px">${cupos} lugares en ${tables.length} mesas</span>
    <span class="sp"></span><button class="btn" data-a="print">Imprimir plano</button><button class="btn" data-a="add-table">+ Mesa</button>
  </div>
  ${un.length?`<div class="panel" style="margin-bottom:16px"><h3>Sin mesa asignada <small>${un.length} invitados</small></h3>
    <div class="chips">${un.map(g=>`<label class="chip" style="display:inline-flex;gap:6px;align-items:center">${esc(g.name)}<select class="tsel" data-c="table" data-id="${g.id}" aria-label="Asignar mesa a ${esc(g.name)}"><option value="">Mesa…</option>${tables.map(t=>`<option value="${t.n}">${esc(t.name)} (${t.gs.length}/${t.seats})</option>`).join('')}</select></label>`).join('')}</div></div>`:''}
  <div class="tables">${tables.map(t=>`<div class="mesa">
    <div class="mh"><button class="linkbtn tn" data-a="edit-mesa" data-n="${t.n}">${esc(t.name)}</button><span class="num muted" style="font-size:12px">${t.gs.length}/${t.seats}</span></div>
    <div class="seats ${t.gs.length>t.seats?'over':''}">${Array.from({length:t.seats},(_,i)=>`<i class="${i<t.gs.length?'f':''}"></i>`).join('')}</div>
    <ul>${t.gs.map(g=>`<li><span>${esc(g.name)}${g.diet?` <span class="muted">· ${g.diet[0]}</span>`:''}</span><button data-a="unseat" data-id="${g.id}" aria-label="Sacar a ${esc(g.name)} de la mesa">${ic('x')}</button></li>`).join('')||'<li class="muted">Mesa libre</li>'}</ul>
  </div>`).join('')}</div>`;
}

function presupuesto(w,s){
  const cats={};w.expenses.forEach(e=>{cats[e.cat]=cats[e.cat]||{t:0,p:0};cats[e.cat].t+=e.total;cats[e.cat].p+=e.paid});
  const max=Math.max(...Object.values(cats).map(c=>c.t),1);
  const free=w.budget-s.committed;
  return `<div class="grid g4" style="margin-bottom:16px">
    ${kpi('Presupuesto total',moneyK(w.budget),'Definido con los novios')}
    ${kpi('Comprometido',moneyK(s.committed),`${pct(s.committed,w.budget)}% del total`,Math.min(100,pct(s.committed,w.budget)))}
    ${kpi('Pagado',moneyK(s.paid),`${pct(s.paid,s.committed)}% de lo comprometido`,pct(s.paid,s.committed))}
    ${kpi(free>=0?'Disponible':'Excedido',`<span style="color:var(--${free>=0?'ink':'bad'})">${moneyK(Math.abs(free))}</span>`,`Saldo a pagar: ${moneyK(s.committed-s.paid)}`)}
  </div>
  <div class="grid g3" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr)">
    <div class="panel"><h3>Por categoría</h3>
      <div class="legend"><span><i style="background:var(--accent)"></i>Pagado</span><span><i style="background:var(--accent-soft);border:1px solid var(--line)"></i>Saldo</span></div>
      <div class="cats">${Object.entries(cats).sort((a,b)=>b[1].t-a[1].t).map(([c,v])=>`<div class="cat">
        <div class="top"><span>${esc(c)}</span><span class="num">${moneyK(v.t)}</span></div>
        <div class="stack" style="width:${Math.max(8,v.t/max*100)}%"><i class="p" style="width:${pct(v.p,v.t)}%"></i><i class="c" style="flex:1"></i></div>
      </div>`).join('')}</div></div>
    <div>
      <div class="toolbar"><b>Gastos y pagos</b><span class="sp"></span><button class="btn" data-a="export-expenses">Exportar CSV</button><button class="btn pri" data-a="add-expense">+ Gasto</button></div>
      <div class="tablewrap"><table style="min-width:640px">
        <thead><tr><th>Concepto</th><th class="r">Total</th><th class="r">Pagado</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
        <tbody>${w.expenses.slice().sort((a,b)=>(a.paid>=a.total)-(b.paid>=b.total)||a.due.localeCompare(b.due)).map(e=>{
          const done=e.paid>=e.total,d=daysUntil(e.due),pl=planDe(e),open=ui.expOpen===e.id;return `<tr>
          <td><button class="linkbtn tw" data-a="exp-toggle" data-id="${e.id}" aria-expanded="${open}">${ic('chev',open?'open':'')}<b>${esc(e.concept)}</b></button><div class="muted" style="font-size:12px;padding-left:16px">${esc(e.cat)}${pl?` · ${pl.filter(c=>c.paid).length}/${pl.length} cuotas`:''}</div></td>
          <td class="r num">${money(e.total)}</td><td class="r num">${money(e.paid)}</td>
          <td class="num" style="font-size:12.5px">${fDate(e.due)}</td>
          <td>${done?'<span class="pill ok">Pagado</span>':e.paid>0?`<span class="pill ${d<=15?'warn':'acc'}">Pagado ${pct(e.paid,e.total)}%</span>`:`<span class="pill ${d<=15?'bad':''}">Sin pagar</span>`}</td>
          <td class="r">${done?'':`<button class="btn sm" data-a="pay" data-id="${e.id}">Registrar pago</button>`}</td>
        </tr>${open?`<tr class="subrow"><td colspan="6">
          ${pl?`<div class="cuotas">${pl.map(c=>{const cd=daysUntil(c.due);return `<div class="cuota ${c.paid?'ok':''}">
              <div><b>${esc(c.label)}</b><div class="sub">${c.paid?'Pagada':cd<0?`Vencida hace ${-cd} d`:`Vence ${fDate(c.due)}`}</div></div>
              <span class="num">${money(c.amount)}</span>
              ${c.paid?'<span class="pill ok">Pagada</span>':`<button class="btn sm pri" data-a="pay-cuota" data-id="${c.id}">Pagar</button>`}
            </div>`}).join('')}</div>`
          :`<div class="row" style="gap:10px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">Este gasto se paga de una sola vez. Los proveedores suelen cobrar en seña, segundo pago y saldo.</span>
             <button class="btn sm" data-a="exp-plan" data-id="${e.id}">Armar plan de pagos</button></div>`}
        </td></tr>`:''}`}).join('')}</tbody></table></div>
    </div>
  </div>`;
}

function proveedores(w){
  return `<div class="toolbar"><span class="muted" style="font-size:12.5px">Mové cada proveedor por las etapas. Cuando pasa a <b>Presupuestado</b>, los novios lo aprueban desde su portal.</span><span class="sp"></span><button class="btn pri" data-a="add-vendor">+ Proveedor</button></div>
  <div class="kanban">${VSTAT.map((st,i)=>{const vs=w.vendors.filter(v=>v.status===st);return `<section class="col"><h5>${VLABEL[st]}<span class="num">${vs.length}</span></h5>
    ${vs.map(v=>{const e=w.expenses.find(x=>x.vendorId===v.id);return `<div class="vcard">
      <div class="vc">${esc(v.cat)}</div><div class="vn">${esc(v.name)}</div>
      <div class="vm">${money(v.amount)}</div>
      <div class="vp">${esc(v.contact)} · <span class="num" style="user-select:all">${esc(v.phone)}</span></div>
      ${e?`<div class="bar" style="margin-top:2px"><i style="width:${pct(e.paid,e.total)}%"></i></div>`:''}
      <div class="act"><button class="btn sm ghost" data-a="vmove" data-id="${v.id}" data-d="-1" ${i===0?'disabled style="visibility:hidden"':''} aria-label="Pasar ${esc(v.name)} a la etapa anterior">${ic('left')}</button>
      ${st==='presupuestado'?'<span class="pill warn" style="align-self:center">Espera novios</span>':''}
      <button class="btn sm" data-a="vmove" data-id="${v.id}" data-d="1" ${i===4?'disabled style="visibility:hidden"':''} aria-label="Pasar ${esc(v.name)} a la etapa siguiente">${ic('right')}</button></div>
    </div>`}).join('')||'<div class="muted" style="font-size:12px;padding:6px">Vacío</div>'}
  </section>`}).join('')}</div>`;
}

function checklist(w){
  const ts=w.tasks.filter(t=>ui.tOwner==='todos'||t.owner===ui.tOwner).slice().sort((a,b)=>a.due.localeCompare(b.due));
  const groups=[['Vencidas',ts.filter(t=>!t.done&&daysUntil(t.due)<0),'bad'],['Próximos 30 días',ts.filter(t=>!t.done&&daysUntil(t.due)>=0&&daysUntil(t.due)<=30),'warn'],['Más adelante',ts.filter(t=>!t.done&&daysUntil(t.due)>30),''],['Completadas',ts.filter(t=>t.done).reverse(),'ok']];
  return `<div class="toolbar"><div class="chips">${[['todos','Todas'],['planner','Planner'],['novios','Novios']].map(([k,l])=>`<button class="chip ${ui.tOwner===k?'on':''}" data-a="towner" data-o="${k}">${l}</button>`).join('')}</div><span class="sp"></span><button class="btn pri" data-a="add-task">+ Tarea</button></div>
  ${groups.filter(g=>g[1].length).map(([l,list,c])=>`<div class="tgroup"><h4>${l} <span class="pill ${c}">${list.length}</span></h4>${list.map(taskRow).join('')}</div>`).join('')}`;
}
function taskRow(t){const d=daysUntil(t.due);return `<div class="task ${t.done?'done':''}">
  <input type="checkbox" class="chk" data-c="task" data-id="${t.id}" ${t.done?'checked':''} aria-label="Completar ${esc(t.title)}">
  <div><div class="tt">${esc(t.title)}</div><div class="tc">${esc(t.cat)}</div></div>
  <span class="pill ${t.owner==='novios'?'acc':''} plain">${t.owner==='novios'?'Novios':'Planner'}</span>
  <span class="due ${!t.done&&d<0?'late':''}">${fDate(t.due)}</span></div>`}

function dia(w){
  const si=w.guests.filter(g=>g.rsvp==='si');
  const tl=w.timeline.slice().sort((a,b)=>sortTime(a.time)-sortTime(b.time));
  return `<div class="grid g3" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
  <div class="panel"><h3>Cronograma del día <span class="row" style="gap:6px"><button class="btn sm" data-a="print">Imprimir</button><button class="btn sm pri" data-a="add-tl">+ Momento</button></span></h3>
    <div class="tl">${tl.map(x=>`<div class="tli ${x.key?'key':''}"><div class="h">${esc(x.time)}</div><div class="dot"></div>
      <div class="body"><b>${esc(x.title)}</b><div>${esc(x.place)} · ${esc(x.who)}</div></div>
      <div class="x"><button class="btn sm ghost" data-a="del-tl" data-id="${x.id}" aria-label="Quitar momento">${ic('x')}</button></div></div>`).join('')}</div></div>
  <div class="grid" style="align-content:start">
    <div class="panel"><h3>Contactos del día</h3><div class="list">${w.vendors.filter(v=>['senado','confirmado'].includes(v.status)).map(v=>`<div class="li" style="grid-template-columns:1fr auto"><div><div class="t">${esc(v.name)}</div><div class="sub">${esc(v.cat)} · ${esc(v.contact)}</div></div><span class="num" style="font-size:12px;user-select:all">${esc(v.phone)}</span></div>`).join('')||'<div class="empty">Todavía no hay proveedores señados.</div>'}</div></div>
    <div class="panel"><h3>Para catering</h3>
      <div class="minirows" style="grid-template-columns:1fr auto">
        <span>Cubiertos confirmados</span><b class="num">${si.length}</b>
        <span class="muted">Adultos</span><b class="num">${si.filter(g=>g.kind!=='niño').length}</b>
        <span class="muted">Menú de niños</span><b class="num">${si.filter(g=>g.kind==='niño').length}</b>
        ${['Vegetariano','Vegano','Celíaco'].map(d=>`<span>${d}</span><b class="num">${si.filter(g=>g.rsvp==='si'&&g.diet===d).length}</b>`).join('')}
        <span>Mesas</span><b class="num">${w.tables}</b>
      </div></div>
  </div></div>`;
}
const sortTime=t=>{const [h,m]=t.split(':').map(Number);return (h<10?h+24:h)*60+m};

/* ---------- couple portal ---------- */
function portal(w,s){
  const prog=Math.round((pct(s.tasksDone,w.tasks.length)+pct(s.paid,s.committed)+pct(s.si,s.inv)+pct(s.vConf,w.vendors.length))/4);
  const C=2*Math.PI*58;
  const appr=w.vendors.filter(v=>v.status==='presupuestado');
  const mine=w.tasks.filter(t=>t.owner==='novios').sort((a,b)=>(a.done-b.done)||a.due.localeCompare(b.due));
  return `<section class="hero"><div class="hero-body">
    <h1 class="couple">${coupleHTML(w.couple)}</h1>
    <div class="meta"><span>${fLong(w.date)}</span><span>${esc(w.venue)}, ${esc(w.city)}</span></div>
    <div class="row" style="margin-top:14px;flex-wrap:wrap"><span class="pill acc">Organización ${prog}% lista</span>${appr.length?`<span class="pill warn">${appr.length} presupuesto${appr.length>1?'s':''} para aprobar</span>`:''}</div>
  </div>
  <div class="ring"><svg width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r="58" fill="none" stroke="var(--line)" stroke-width="7"/><circle cx="66" cy="66" r="58" fill="none" stroke="var(--blush)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-Math.max(0,Math.min(1,1-s.days/365)))}"/></svg><div class="in"><b>${s.days}</b><span>días</span></div></div>
  </section>

  <div class="grid g4" style="margin-bottom:16px">
    ${kpi('Invitados confirmados',`${s.si}<small> / ${s.inv}</small>`,`${s.pend} todavía no respondieron`,pct(s.si,s.inv))}
    ${kpi('Pagado',`${pct(s.paid,s.committed)}<small> %</small>`,`Resta ${moneyK(s.committed-s.paid)}`,pct(s.paid,s.committed))}
    ${kpi('Proveedores confirmados',`${s.vConf}<small> / ${w.vendors.length}</small>`,'Gestionados por tu planner',pct(s.vConf,w.vendors.length))}
    ${kpi('Tus tareas',`${mine.filter(t=>t.done).length}<small> / ${mine.length}</small>`,'Las marcás acá y la planner lo ve',pct(mine.filter(t=>t.done).length,mine.length))}
  </div>

  <div class="grid g2">
    <div class="grid" style="align-content:start">
      <div class="panel"><h3>Presupuestos para aprobar <small>${appr.length}</small></h3>
        ${appr.map(v=>`<div class="approve"><div><div class="vc muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:600">${esc(v.cat)}</div><b>${esc(v.name)}</b><div class="num" style="font-size:13px">${money(v.amount)}</div></div>
          <div class="row"><button class="btn sm" data-a="reject" data-id="${v.id}">Pedir otra opción</button><button class="btn sm pri" data-a="approve" data-id="${v.id}">Aprobar</button></div></div>`).join('')||'<div class="empty">No hay presupuestos esperando. Tu planner te avisa cuando llegue uno.</div>'}
      </div>
      <div class="panel"><h3>Tus tareas</h3>${mine.map(taskRow).join('')}</div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel"><h3>El gran día</h3>
        <div class="tl">${w.timeline.slice().sort((a,b)=>sortTime(a.time)-sortTime(b.time)).filter(x=>x.key||x.who!=='Planner').map(x=>`<div class="tli ${x.key?'key':''}" style="grid-template-columns:56px 22px 1fr"><div class="h">${esc(x.time)}</div><div class="dot"></div><div class="body"><b>${esc(x.title)}</b><div>${esc(x.place)}</div></div></div>`).join('')}</div></div>
      <div class="panel"><h3>Próximos pagos</h3><div class="list">${w.expenses.filter(e=>e.paid<e.total).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5).map(e=>`<div class="li">${dateTile(e.due)}<div><div class="t">${esc(e.concept)}</div><div class="sub">${esc(e.cat)}</div></div><span class="num">${money(e.total-e.paid)}</span></div>`).join('')||'<div class="empty">Todo pagado.</div>'}</div></div>
    </div>
  </div>`;
}

/* ---------- centro de mensajes ----------
   Sin API: armamos el texto con los datos de la boda y lo abrimos en el WhatsApp
   o el mail de la planner, que aprieta enviar. Ver CLAUDE.md para el camino a la API. */
const waDigits=p=>{let d=String(p||'').replace(/\D/g,'');
  if(d.slice(0,2)==='54'&&d[2]!=='9')d='549'+d.slice(2);        // los móviles argentinos van con el 9
  return d};
const waLink=(phone,text)=>`https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;
const mailLink=(email,subject,text)=>`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
const fill=(t,v)=>String(t).replace(/\{(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:m);

const TPL=[
  {id:'rsvp',label:'Recordar confirmación',aud:'pend',when:'activa',
   desc:'A los invitados que todavía no respondieron.',
   body:'Hola {nombre}! Te escribo de parte de {novios}.\nTodavía no tenemos tu confirmación para la boda del {fecha} en {lugar}.\nPodés responder acá en un minuto: {link}\nGracias!'},
  {id:'invite',label:'Enviar invitación',aud:'todos',when:'activa',
   desc:'A toda la lista, con el link de confirmación.',
   body:'Hola {nombre}! {novios} se casan el {fecha} en {lugar}.\nAcá podés ver los detalles y confirmar tu asistencia: {link}\nCualquier duda, escribime.'},
  {id:'cuota',label:'Aviso de cuota',aud:'novios',when:'activa',
   desc:'A los novios, por los honorarios del estudio.',
   body:'Hola {nombre}! Te recuerdo que la cuota "{cuota}" de {monto} vence el {vence}.\nCualquier cosa avisame y lo vemos.'},
  {id:'reunion',label:'Confirmar reunión',aud:'novios',when:'activa',
   desc:'A los novios, con la próxima reunión agendada.',
   body:'Hola {nombre}! Te confirmo nuestra próxima reunión: {reunion}.\nSi no te queda cómodo, decime y lo movemos.'},
  {id:'ruta',label:'Hoja de ruta del Día D',aud:'prov',when:'activa',
   desc:'A cada proveedor señado o confirmado, con su horario.',
   body:'Hola {nombre}! Te paso la hoja de ruta de la boda de {novios}, {fecha} en {lugar}.\n\n{ruta}\n\nCualquier cambio te aviso. Gracias!'},
  {id:'seguimiento',label:'Seguimiento de consulta',aud:'novios',when:'lead',
   desc:'A una pareja que consultó y todavía no cerró.',
   body:'Hola {nombre}! Te escribo por la consulta para la boda del {fecha}.\nQuedé en pasarte una propuesta: ¿te viene bien que coordinemos una llamada esta semana?'},
  {id:'gracias',label:'Agradecimiento',aud:'si',when:'finalizada',
   desc:'A los que fueron, después de la boda.',
   body:'Hola {nombre}! Gracias por acompañar a {novios} el {fecha}. Fue una noche hermosa.'},
];
const tplFor=w=>TPL.filter(t=>t.when===w.status);

function audience(w,t){
  const g2r=g=>({id:g.id,name:g.name,phone:g.phone,email:'',token:g.token,sub:g.group+(g.phone?'':' · sin teléfono')});
  if(t.aud==='pend')return w.guests.filter(g=>g.rsvp==='pendiente'&&!g.plusOf).map(g2r);
  if(t.aud==='todos')return w.guests.filter(g=>!g.plusOf).map(g2r);
  if(t.aud==='si')return w.guests.filter(g=>g.rsvp==='si'&&!g.plusOf).map(g2r);
  if(t.aud==='novios')return w.partners.map(p=>({id:p.id,name:p.name,phone:p.phone,email:p.email,sub:p.role}));
  if(t.aud==='prov')return w.vendors.filter(v=>['senado','confirmado'].includes(v.status))
    .map(v=>({id:v.id,name:v.name,phone:v.phone,email:'',sub:v.cat}));
  return [];
}
/* la hoja de ruta de un proveedor: sus momentos, más los claves de la noche */
function rutaDe(w,cat){
  const first=x=>norm(x).split(/[\s\/]+/)[0];
  const tl=w.timeline.slice().sort((a,b)=>sortTime(a.time)-sortTime(b.time));
  const mine=tl.filter(x=>cat&&(norm(cat).includes(first(x.who))||first(x.who)===first(cat||'')));
  const list=(mine.length?mine:tl.filter(x=>x.key));
  return list.map(x=>`${x.time} · ${x.title}${x.place?' ('+x.place+')':''}`).join('\n');
}
function msgVars(w,r,t){
  const f=fees(w), nx=f.next, mt=w.meetings.filter(m=>!m.done).sort((a,b)=>a.date.localeCompare(b.date))[0];
  return {nombre:firstName(r.name),novios:w.couple,fecha:fLong(w.date),lugar:`${w.venue}, ${w.city}`,
    link:rsvpLink(w,(r&&r.token)?r:null),hora:(w.timeline.find(x=>/ceremonia/i.test(x.title))||{}).time||'',
    cuota:nx?nx.label:'—',monto:nx?money(nx.amount):'—',vence:nx?fLong(nx.due):'—',
    reunion:mt?`${mt.title}, ${fLong(mt.date)} a las ${mt.time} en ${mt.place||'a confirmar'}`:'a coordinar',
    ruta:t.id==='ruta'?rutaDe(w,r.sub):''};
}

function mensajes(w){
  const tpls=tplFor(w);
  if(!tpls.length)return `<div class="panel"><div class="empty">No hay plantillas para una boda en este estado.</div></div>`;
  const t=tpls.find(x=>x.id===ui.msgT)||tpls[0];
  const body=ui.msgBody!=null?ui.msgBody:t.body;
  const list=audience(w,t);
  const hist=w.messages.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const sentIds=new Set(w.messages.filter(m=>m.template===t.id).map(m=>m.toId));
  const preview=list.length?fill(body,msgVars(w,list[0],t)):body;

  return `<div class="toolbar">
      <div class="chips">${tpls.map(x=>`<button class="chip ${x.id===t.id?'on':''}" data-a="msg-t" data-t="${x.id}">${x.label}</button>`).join('')}</div>
    </div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="panel"><h3>El mensaje <small>${esc(t.desc)}</small></h3>
      <textarea class="input" id="msgbody" data-c="msgbody" rows="9">${esc(body)}</textarea>
      <p class="vars">Se reemplazan solos: ${['nombre','novios','fecha','lugar','link','cuota','monto','vence','reunion','ruta'].map(v=>`<code>{${v}}</code>`).join(' ')}</p>
      ${list.length?`<div class="preview"><span class="pl">Así le llega a ${esc(firstName(list[0].name))}</span>${esc(preview)}</div>`:''}
      <div class="row" style="margin-top:12px"><button class="btn" data-a="msg-copy">Copiar texto</button>
        ${ui.msgBody!=null?`<button class="btn ghost" data-a="msg-reset">Volver a la plantilla</button>`:''}</div>
    </div>
    <div class="panel"><h3>Destinatarios <small>${list.length}</small></h3>
      ${list.length?`<div class="list msglist">${list.map(r=>{
        const txt=fill(body,msgVars(w,r,t)), ya=sentIds.has(r.id);
        return `<div class="li" style="grid-template-columns:1fr auto">
          <div><div class="t">${esc(r.name)}</div><div class="sub">${esc(r.sub||'')}${r.phone?' · '+esc(r.phone):''}</div></div>
          <div class="row" style="gap:6px">
            ${ya?'<span class="pill ok">Enviado</span>':''}
            ${r.phone?`<button class="btn sm" data-a="msg-send" data-ch="whatsapp" data-id="${r.id}" data-t="${t.id}">WhatsApp</button>`:''}
            ${r.email?`<button class="btn sm" data-a="msg-send" data-ch="mail" data-id="${r.id}" data-t="${t.id}">Mail</button>`:''}
            ${!r.phone&&!r.email?'<span class="pill warn">Sin contacto</span>':''}
          </div></div>`}).join('')}</div>`
      :'<div class="empty">Nadie entra en esta lista ahora mismo.</div>'}
      <p class="muted" style="font-size:12px;margin:12px 0 0">Se abre WhatsApp o tu correo con el mensaje escrito. Enviás vos: el sistema no manda nada solo.</p>
    </div>
  </div>
  <div class="panel"><h3>Enviados <small>${hist.length}</small></h3>
    <div class="list">${hist.slice(0,15).map(m=>`<div class="li">${dateTile(m.date)}
      <div><div class="t">${esc(m.title)}</div><div class="sub">${esc(m.to)} · ${m.channel==='whatsapp'?'WhatsApp':'Mail'}</div></div>
      <span class="pill plain">${esc(m.tplLabel)}</span></div>`).join('')
      ||'<div class="empty">Todavía no mandaste nada desde acá.</div>'}</div>
  </div>`;
}

/* ---------- RSVP público: lo que abre el invitado ---------- */
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
/* Asistente de invitados. No hay modelo de lenguaje: responde con lo que la planner
   cargó en la ficha (profile.faq) y con los datos de la boda. Si no lo sabe, lo dice. */
const BOT=[
 {id:'hora',q:'¿A qué hora empieza?',k:'hora horario empieza comienza arranca cuando puntual',
  a:w=>{const c=w.timeline.find(x=>/ceremonia/i.test(x.title)),e=w.timeline.find(x=>/entrada|salón|salon/i.test(x.title));
    if(!c)return'Todavía no está cerrado el horario. Te aviso apenas lo tengamos.';
    return `La ceremonia es a las ${c.time} en ${c.place}.${e?` La entrada al salón es a las ${e.time}.`:''} Conviene llegar 20 minutos antes.`}},
 {id:'donde',q:'¿Dónde es?',loose:1,k:'donde lugar direccion dirección llegar llego ubicacion ubicación mapa',
  a:w=>`Es en ${w.venue}, ${w.city}. Te dejo el mapa: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.venue+', '+w.city)}`},
 {id:'ropa',q:'¿Cómo me visto?',k:'vestimenta vestir visto ropa codigo código pongo traje vestido etiqueta formal zapatos',
  a:w=>(w.profile.faq||{}).dress||(w.profile.palette?`El estilo es ${String(w.style||'').toLowerCase()}, con paleta ${w.profile.palette.toLowerCase()}.`:'Todavía no definieron código de vestimenta.')},
 {id:'regalo',q:'¿Qué les regalo?',k:'regalo regalos lista alias transferencia plata sobre',
  a:w=>(w.profile.faq||{}).gifts||'Sobre los regalos todavía no me dijeron nada. Preguntales directamente.'},
 {id:'ninos',q:'¿Puedo llevar a los chicos?',k:'niño niños nino ninos chicos hijos bebe bebé menores nenes familia',
  a:w=>(w.profile.faq||{}).kids||'No tengo confirmado si la fiesta admite chicos. Consultalo con los novios.'},
 {id:'hotel',q:'¿Dónde puedo alojarme?',k:'hotel alojamiento alojo alojarme dormir hospedaje cabaña cabana quedarme noche',
  a:w=>(w.profile.faq||{}).lodging||'Todavía no hay alojamiento reservado para invitados.'},
 {id:'traslado',q:'¿Cómo vuelvo?',k:'micro traslado transporte colectivo estacionamiento auto remis taxi volver vuelvo vuelta',
  a:w=>(w.profile.faq||{}).transport||(w.profile.faq||{}).extra||'Todavía no hay traslados organizados. Si se suma un micro, te aviso.'},
 {id:'menu',q:'Tengo una restricción alimentaria',k:'menu menú comida comer vegetariano vegano celiaco celíaco dieta tacc alergia alergico',
  a:()=> 'Marcalo en el formulario de arriba, en "¿Comés algo especial?". Hay opción vegetariana, vegana y sin TACC, y llega directo al catering.'},
 {id:'acomp',q:'¿Puedo ir con alguien?',k:'acompañante acompanante pareja novio novia llevar alguien invitado extra mas uno',
  a:()=> 'Depende de tu invitación. Si en el formulario te aparece el campo de acompañante, podés sumar a una persona; si no aparece, tu lugar es individual.'},
 {id:'confirmar',q:'¿Cómo confirmo?',k:'confirmar confirmo asistencia rsvp anotar responder',
  a:()=> 'Acá arriba: buscá tu nombre, elegí si venís y listo. Podés cambiar la respuesta cuando quieras.'},
];
/* palabras que aparecen en cualquier pregunta y no dicen de qué se trata */
const BOTSTOP=new Set('que como cual cuales quien cuando cuanto hay los las una unos unas con por para del mis sus tengo puedo podemos algo mas muy esta este estos esos son ser voy ustedes nos alguna alguno hola gracias'.split(' '));
const stem=x=>x.replace(/s$/,'').slice(0,5);
function botAnswer(w,q){
  const words=[...new Set(norm(q).replace(/[^a-z0-9ñ\s]/g,' ').split(/\s+/).filter(x=>x.length>=3&&!BOTSTOP.has(x)))];
  let best=null,score=0;
  BOT.forEach(b=>{
    const keys=b.k.split(' ').map(stem);
    const n=words.filter(x=>keys.includes(stem(x))).length*(b.loose?.9:1);
    if(n>score){score=n;best=b}
  });
  if(!best)return `Eso no lo tengo cargado. Preguntale a ${w.partners.map(p=>firstName(p.name)).join(' o a ')} — ellos te lo van a saber decir.`;
  return best.a(w);
}

/* El RSVP lee de dos lados: la boda local (demo) o la API pública, cuando hay
   backend. La API nunca entrega la lista de invitados: con el link personal
   llega directo el invitado; con el general, se busca por nombre. */
const DIET_OPTS=[['','Como de todo'],'Vegetariano','Vegano','Celíaco'];
function rsvpWedding(){return ui.rsvp==='remote'?(ui.pub&&ui.pub.w):S.weddings.find(x=>x.id===ui.rsvp)}
function rsvpGuest(w){
  if(!ui.rsvpGuest||!w)return null;
  if(ui.rsvp==='remote')return ui.pub.guest&&ui.pub.guest.id===ui.rsvpGuest?ui.pub.guest:null;
  const g=w.guests.find(x=>x.id===ui.rsvpGuest);if(!g)return null;
  const a=w.guests.find(x=>x.plusOf===g.id);
  return {id:g.id,name:g.name,rsvp:g.rsvp,diet:g.diet||'',plus:!!g.plus,companion:a?a.name:''};
}
const rsvpMin=()=>ui.rsvp==='remote'?3:2;
function rsvpHits(w,q){
  if(ui.rsvp==='remote')return (ui.pub.hits&&ui.pub.hitsFor===q)?ui.pub.hits:null;
  return w.guests.filter(x=>!x.plusOf&&norm(x.name).includes(q)).slice(0,6).map(x=>({id:x.id,name:x.name,rsvp:x.rsvp,plus:x.plus}));
}
async function loadPublic(){
  const p=ui.pub;
  try{
    const r=await window.Alianza.publicGet(p.key);
    if(ui.pub!==p)return;
    p.w=r.wedding;p.loading=false;
    if(r.guest){p.guest=r.guest;ui.rsvpGuest=r.guest.id;ui.rsvpByToken=true;ui.rsvpDone=r.guest.rsvp!=='pendiente'}
  }catch(e){if(ui.pub!==p)return;p.loading=false;p.error=e.status===404?'missing':e.message}
  render();
}
let searchT=null;
function searchPublic(q){
  clearTimeout(searchT);
  const p=ui.pub;if(!p||q.length<3)return;
  p.searching=true;
  searchT=setTimeout(async()=>{
    try{const r=await window.Alianza.publicSearch(p.key,q);if(ui.pub!==p)return;p.hits=r.guests;p.hitsFor=q}
    catch(e){if(ui.pub!==p)return;p.hits=[];p.hitsFor=q;toast(e.status===0?'Sin conexión. Probá de nuevo en un momento.':e.message)}
    p.searching=false;
    if(norm(ui.rsvpQuery.trim())===q){ui.focus='rq';render()}
  },260);
}
async function sendRsvp(){
  const w=rsvpWedding(),g=rsvpGuest(w),root=document.querySelector('[data-form]');if(!g||!root)return;
  const rsvp=root.querySelector('input[name="att"]:checked').value, diet=root.querySelector('#rdiet').value;
  const ac=root.querySelector('#racomp'), name=ac?ac.value.trim():'';
  if(ui.rsvp==='remote'){
    ui.pub.sending=true;render();
    try{
      const r=await window.Alianza.publicConfirm(ui.pub.key,{guestId:g.id,rsvp,diet,companion:name});
      ui.pub.guest=r.guest;ui.rsvpGuest=r.guest.id;ui.rsvpDone=true;
    }catch(e){toast(e.status===0?'No pudimos enviar tu respuesta: no hay conexión. Probá de nuevo.':e.message)}
    ui.pub.sending=false;render();return;
  }
  const lg=w.guests.find(x=>x.id===g.id);
  lg.rsvp=rsvp;lg.diet=diet;if(rsvp!=='si')lg.table=null;
  const prev=w.guests.find(x=>x.plusOf===lg.id);
  if(rsvp==='si'&&name&&lg.plus){
    if(prev)prev.name=name;
    else w.guests.push({id:uid(),name,side:lg.side,group:lg.group,rsvp:'si',diet:'',table:null,kind:'adulto',plus:false,plusOf:lg.id,phone:'',token:tok()});
  }else if(prev)w.guests=w.guests.filter(x=>x.id!==prev.id);
  ui.rsvpDone=true;save();render();
}

function rsvpPage(){
  const p=ui.pub||{};
  const shell=inner=>`<div class="rsvp">${inner}</div>`;
  if(ui.rsvp==='remote'&&p.loading)return shell(`<div class="rsvp-wait" role="status"><span class="spin" aria-hidden="true"></span>Abriendo la invitación…</div>`);
  const w=rsvpWedding();
  if(ui.rsvp==='missing'||!w||p.error)return shell(`<section class="rsvp-card"><h2>No encontramos esta invitación</h2>
    <p class="lead-p">${p.error&&p.error!=='missing'?esc(p.error):'El link está incompleto o ya no existe. Pedile a los novios que te lo vuelvan a mandar.'}</p></section>`);
  const remote=ui.rsvp==='remote', d=daysUntil(w.date);
  const opening=!ui.rsvpOpened;ui.rsvpOpened=true;
  const head=`<header class="rsvp-head ${opening?'opening':''}">
    <svg class="rsvp-rings" viewBox="0 0 120 60" aria-hidden="true"><circle class="r1" cx="47" cy="30" r="22"/><circle class="r2" cx="73" cy="30" r="22"/><path class="r1-front" d="M60 12.25A22 22 0 0 1 69 30"/></svg>
    <h1 class="couple">${coupleHTML(w.couple)}</h1>
    <p class="when">${fLong(w.date)}</p>
    <p class="where">${esc(w.venue)} · ${esc(w.city)}</p>
    ${d>0?`<p class="cd"><b class="num">${d}</b><span>${d===1?'día':'días'} para el sí</span></p>`:d===0?'<p class="cd"><span>Es hoy</span></p>':''}
  </header>`;
  const back=!remote||(window.Alianza&&window.Alianza.user);
  const foot=`<footer class="rsvp-foot">Invitación gestionada con <b>Alianza Wedding Studio</b>${back?` · <a href="#" data-a="rsvp-exit">volver al sistema</a>`:''}</footer>`;
  const sugeridas=BOT.filter(b=>!ui.botLog.some(x=>x.id===b.id)).slice(0,4);
  const bot=`<section class="bot" aria-labelledby="bot_t">
    <h3 id="bot_t">¿Tenés una duda?</h3>
    ${ui.botLog.length?`<div class="botlog" aria-live="polite">${ui.botLog.map(x=>`
      <p class="bq">${esc(x.q)}</p>
      <p class="ba">${esc(x.a).replace(/(https?:\/\/\S+)/g,'<a href="$1" target="_blank" rel="noopener">ver mapa</a>')}</p>`).join('')}</div>`:''}
    <div class="chips">${sugeridas.map(b=>`<button class="chip" data-a="bot-ask" data-q="${esc(b.q)}" data-id="${b.id}">${esc(b.q)}</button>`).join('')}</div>
    <form class="botbar" data-bot>
      <label class="sr" for="botq">Tu pregunta</label>
      <input class="input" id="botq" placeholder="Escribí tu pregunta" autocomplete="off">
      <button class="btn">Preguntar</button>
    </form>
    <p class="botnote">Respuestas automáticas, armadas con lo que cargó la organizadora. Si algo no figura, te lo va a decir.</p>
  </section>`;
  const wrap=inner=>shell(`${head}${inner}${bot}${foot}`);

  const g=rsvpGuest(w);
  if(g&&ui.rsvpDone){
    return wrap(`<section class="rsvp-card done" aria-live="polite">
      <h2>${g.rsvp==='si'?'¡Nos vemos ahí!':'Gracias por avisar'}</h2>
      <p class="lead-p">${g.rsvp==='si'
        ?`Guardamos tu lugar, ${esc(firstName(g.name))}. Te esperamos el ${fLong(w.date)} en ${esc(w.venue)}.`
        :`Anotamos que no vas a poder venir. Vamos a extrañarte, ${esc(firstName(g.name))}.`}</p>
      ${g.rsvp==='si'?`<dl class="resumen">
        <div><dt>A nombre de</dt><dd>${esc(g.name)}</dd></div>
        <div><dt>Menú</dt><dd>${esc(g.diet||'Estándar')}</dd></div>
        ${g.companion?`<div><dt>Te acompaña</dt><dd>${esc(g.companion)}</dd></div>`:''}
      </dl>`:''}
      <button class="btn" data-a="rsvp-edit">Cambiar mi respuesta</button>
    </section>`);
  }

  if(g){
    const sending=remote&&p.sending;
    return wrap(`<section class="rsvp-card" data-form>
      ${ui.rsvpByToken?'':`<button class="linkbtn back" data-a="rsvp-back">${ic('left')} No soy ${esc(firstName(g.name))}</button>`}
      <h2>Hola, ${esc(firstName(g.name))}</h2>
      <p class="lead-p">Contanos si vas a poder acompañarnos. Podés cambiar la respuesta cuando quieras.</p>
      <fieldset class="opts"><legend class="sr">¿Venís?</legend>
        <label class="opt"><input type="radio" name="att" value="si" ${g.rsvp!=='no'?'checked':''}><span class="ot">Sí, voy</span><span class="os">Cuenten conmigo</span></label>
        <label class="opt"><input type="radio" name="att" value="no" ${g.rsvp==='no'?'checked':''}><span class="ot">No puedo</span><span class="os">Esta vez no llego</span></label>
      </fieldset>
      <div class="field"><label for="rdiet">¿Comés algo especial?</label>
        <select class="select" id="rdiet">${DIET_OPTS.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${g.diet===v?'selected':''}>${esc(l)}</option>`}).join('')}</select></div>
      ${g.plus?`<div class="field"><label for="racomp">¿Venís con alguien? <span class="muted">(opcional)</span></label>
        <input class="input" id="racomp" value="${esc(g.companion||'')}" placeholder="Nombre y apellido de tu acompañante" autocomplete="off"></div>`:''}
      <button class="btn pri big" data-a="rsvp-send" ${sending?'disabled aria-busy="true"':''}>${sending?'<span class="spin" aria-hidden="true"></span>Enviando…':'Enviar mi respuesta'}</button>
    </section>`);
  }

  const q=norm(ui.rsvpQuery.trim()), min=rsvpMin(), hits=q.length<min?[]:rsvpHits(w,q);
  const hasGuests=remote?w.hasGuests:w.guests.length>0;
  return wrap(`<section class="rsvp-card">
    <h2>Confirmá tu asistencia</h2>
    <p class="lead-p">Buscá tu nombre en la lista de invitados para responder.</p>
    <div class="field"><label for="rq">Tu nombre</label>
      <input class="input big" id="rq" data-c="rq" value="${esc(ui.rsvpQuery)}" placeholder="Empezá a escribir tu nombre o apellido" autocomplete="off"></div>
    <div aria-live="polite">${!hasGuests?'<div class="empty">La lista de invitados todavía no está cargada. Escribile a los novios.</div>'
      :q.length<min?`<p class="hint">Escribí al menos ${min===3?'tres':'dos'} letras.</p>`
      :hits===null?'<p class="hint"><span class="spin" aria-hidden="true"></span>Buscando…</p>'
      :hits.length?`<div class="matches">${hits.map(x=>`<button class="match" data-a="rsvp-pick" data-id="${x.id}">
          <span class="mn">${esc(x.name)}</span>
          <span class="ms">${x.rsvp==='pendiente'?'Sin responder':x.rsvp==='si'?'Ya confirmaste':'Respondiste que no venís'}</span>
        </button>`).join('')}</div>`
      :`<p class="hint">No encontramos a nadie con ese nombre. Probá con tu apellido o escribile a los novios.</p>`}</div>
  </section>`);
}

/* ================= modal / toast ================= */
/* modal accesible: foco atrapado adentro, Escape cierra y el foco vuelve a
   quien lo abrió. Un campo puede traer check(valor) → mensaje de error. */
function modalShell(html,labelId){
  const opener=document.activeElement;
  const ov=document.createElement('div');ov.className='overlay';
  ov.innerHTML=html;
  const box=ov.firstElementChild;
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby',labelId);
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;ov.classList.add('closing');
    setTimeout(()=>ov.remove(),160);if(opener&&opener.isConnected)opener.focus()};
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))close()});
  ov.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close()}
    if(e.key==='Tab'){const f=[...box.querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled);
      if(!f.length)return;const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  });
  return {ov,box,close};
}
function form(title,fields,onOk,okLabel='Guardar'){
  const {box:fm,close}=modalShell(`<form class="modal" novalidate><h2 id="m_t">${title}</h2>${fields.map(f=>`<div class="field"><label for="f_${f.id}">${f.label}${f.req?'':' <span class="opt-l">(opcional)</span>'}</label>${
    f.type==='select'?`<select class="select" id="f_${f.id}">${f.options.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(f.value)===String(v)?'selected':''}>${esc(l)}</option>`}).join('')}</select>`
    :f.type==='textarea'?`<textarea class="input" id="f_${f.id}" rows="${f.rows||3}" ${f.ph?`placeholder="${esc(f.ph)}"`:''}>${esc(f.value??'')}</textarea>`
    :`<input class="input" id="f_${f.id}" type="${f.type||'text'}" value="${esc(f.value??'')}" ${f.req?'required':''} ${f.min!=null?`min="${f.min}"`:''} ${f.ph?`placeholder="${esc(f.ph)}"`:''} ${f.type==='number'?'inputmode="numeric"':''}>`}</div>`).join('')}
    <div class="err" role="alert"></div>
    <div class="foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn pri">${okLabel}</button></div></form>`,'m_t');
  const err=m=>{fm.querySelector('.err').textContent=m};
  fm.addEventListener('submit',e=>{e.preventDefault();
    const v={};
    for(const f of fields){
      const el=fm.querySelector('#f_'+f.id);v[f.id]=el.value.trim();
      if(f.req&&!v[f.id]){err(`Completá "${f.label}" para guardar.`);el.focus();return}
      const m=f.check&&v[f.id]&&f.check(v[f.id]);if(m){err(m);el.focus();return}
    }
    const r=onOk(v);if(r===false)return;if(typeof r==='string'){err(r);return}
    close();save();render();});
  setTimeout(()=>fm.querySelector('input,select,textarea')?.focus(),20);
}
/* un toast puede traer una acción ("Deshacer"); con acción dura más */
let tt;function toast(m,action){
  document.querySelector('.toast')?.remove();
  const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');
  t.innerHTML=`<span>${esc(m)}</span>${action?`<button class="toast-btn">${esc(action.label)}</button>`:''}`;
  if(action)t.querySelector('button').addEventListener('click',()=>{t.remove();action.run()});
  document.body.appendChild(t);clearTimeout(tt);
  tt=setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),200)},action?6000:2400);
}
/* borrar sin preguntar, pero con vuelta atrás: se guarda la foto de antes */
function undoable(msg,fn){
  const before=JSON.stringify(S.weddings);
  fn();
  toast(msg,{label:'Deshacer',run:()=>{S.weddings=JSON.parse(before);
    if(!S.weddings.some(w=>w.id===ui.wid))ui.wid=(active()[0]||S.weddings[0]||{}).id;
    save();render();toast('Listo, quedó como estaba')}});
}
/* conflicto: alguien guardó esta boda desde otra sesión mientras la editabas */
function conflictDialog(list){
  const fw=list[0];if(!fw)return;
  const {box,close}=modalShell(`<div class="modal"><h2 id="c_t">${esc(fw.couple)} cambió en otra sesión</h2>
    <p class="modal-lead">Mientras editabas, se guardaron cambios de esta boda desde otro lado (otra pestaña, otro dispositivo o los novios desde su portal). No pisamos nada: elegí con qué versión seguir.</p>
    <div class="foot"><button class="btn" data-k="mine">Quedarme con la mía</button><button class="btn pri" data-k="server">Usar la versión guardada</button></div></div>`,'c_t');
  box.addEventListener('click',e=>{const k=e.target.closest('[data-k]');if(!k)return;
    AL().resolve(fw,k.dataset.k);close();
    toast(k.dataset.k==='server'?'Trajimos la versión guardada':'Guardamos tu versión encima');
    if(list.length>1)setTimeout(()=>conflictDialog(list.slice(1)),200)});
  setTimeout(()=>box.querySelector('[data-k="server"]').focus(),20);
}

/* ================= actions ================= */
const find=(arr,id)=>arr.find(x=>x.id===id);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a, id=b.dataset.id, w=W();
  ui.focus=null;
  switch(a){
    case 'rsvp-exit': e.preventDefault();ui.rsvpGuest=null;ui.rsvpDone=false;ui.rsvpQuery='';ui.botLog=[];ui.pub=null;ui.rsvpByToken=false;ui.rsvpOpened=false;
      history.pushState(null,'',location.pathname+location.search);ui.rsvp=null;
      if(API()&&!AL().user){ui.booting=true;render();boot();return}
      render();return;
    case 'bot-ask': {const w2=rsvpWedding();
      ui.botLog.push({id:b.dataset.id,q:b.dataset.q,a:botAnswer(w2,b.dataset.q)});break}
    case 'rsvp-pick': {
      if(ui.rsvp==='remote'){const h=(ui.pub.hits||[]).find(x=>x.id===id);if(!h)return;ui.pub.guest={...h,diet:'',companion:''}}
      ui.rsvpGuest=id;ui.rsvpDone=false;ui.rsvpByToken=false;break}
    case 'rsvp-back': ui.rsvpGuest=null;ui.rsvpByToken=false;break;
    case 'rsvp-edit': ui.rsvpDone=false;break;
    case 'rsvp-send': e.preventDefault();sendRsvp();return;
    case 'logout': AL().logout();return;
    case 'sync-retry': AL().retry();return;
    case 'msg-t': ui.msgT=b.dataset.t;ui.msgBody=null;break;
    case 'msg-reset': ui.msgBody=null;break;
    case 'msg-copy': {const t=tplFor(w).find(x=>x.id===(ui.msgT||tplFor(w)[0].id));
      const txt=ui.msgBody!=null?ui.msgBody:t.body;
      (navigator.clipboard?.writeText(txt)||Promise.reject()).then(()=>toast('Texto copiado'),()=>toast('No se pudo copiar'));return}
    case 'msg-send': {
      e.preventDefault();
      const t=TPL.find(x=>x.id===b.dataset.t), r=audience(w,t).find(x=>x.id===id);
      const txt=fill(ui.msgBody!=null?ui.msgBody:t.body,msgVars(w,r,t));
      const ch=b.dataset.ch;
      const url=ch==='whatsapp'?waLink(r.phone,txt):mailLink(r.email,`${t.label} · ${w.couple}`,txt);
      window.open(url,'_blank','noopener');
      w.messages.push({id:uid(),date:fmtISO(today0()),channel:ch,to:r.name,toId:r.id,template:t.id,tplLabel:t.label,
        title:`${t.label} a ${r.name}`,body:txt});
      toast(`Abrimos ${ch==='whatsapp'?'WhatsApp':'tu correo'} con el mensaje listo`);break}
    case 'negocio': ui.scope='negocio';ui.view='planner';break;
    case 'print': window.print();return;
    case 'exp-toggle': ui.expOpen=ui.expOpen===id?null:id;break;
    case 'exp-plan': {const ex=find(w.expenses,id);planPagos(ex,w.date);ui.expOpen=id;toast('Plan de pagos armado en 3 cuotas');break}
    case 'pay-cuota': {const ex=w.expenses.find(x=>(x.plan||[]).some(c=>c.id===id));
      const c=ex.plan.find(y=>y.id===id);
      c.paid=true;ex.paid=Math.min(ex.total,ex.paid+c.amount);
      ex.due=(ex.plan.find(y=>!y.paid)||c).due;
      toast(`Pago de ${money(c.amount)} registrado`);break}
    case 'export-guests': {
      const rows=[['Nombre','Lado','Grupo','RSVP','Menú','Tipo','Mesa','Teléfono','Acompañante de']];
      w.guests.forEach(g=>{const de=g.plusOf?(w.guests.find(x=>x.id===g.plusOf)||{}).name:'';
        rows.push([g.name,g.side,g.group,RSVP[g.rsvp],g.diet||'Estándar',g.kind||'adulto',
          g.table?mesaInfo(w,g.table).name:'',g.phone||'',de||''])});
      download(fileName(w,'invitados'),csv(rows));toast(`${w.guests.length} invitados exportados`);return}
    case 'export-expenses': {
      const rows=[['Concepto','Categoría','Total','Pagado','Saldo','Vence','Estado']];
      w.expenses.forEach(e=>rows.push([e.concept,e.cat,e.total,e.paid,e.total-e.paid,e.due,
        e.paid>=e.total?'Pagado':e.paid>0?'Parcial':'Sin pagar']));
      download(fileName(w,'presupuesto'),csv(rows));toast('Presupuesto exportado');return}
    case 'edit-mesa': {const n=+b.dataset.n, mi=mesaInfo(w,n);
      return form(`Mesa ${n}`,[
        {id:'name',label:'Nombre de la mesa',value:mi.name,req:1,ph:'Ej: Mesa principal'},
        {id:'seats',label:'Capacidad',type:'number',value:mi.seats,min:1,req:1}],
        v=>{setMesa(w,n,{name:v.name,seats:Math.max(1,+v.seats||10)});toast('Mesa actualizada')})}
    case 'add-doc': return form('Nuevo documento',[
      {id:'name',label:'Nombre',req:1,ph:'Ej: Contrato firmado con el salón'},
      {id:'kind',label:'Tipo',type:'select',options:['Contrato','Plano','Moodboard','Presupuesto','Factura','Otro']},
      {id:'url',label:'Link',type:'url',req:1,ph:'https://drive.google.com/…',check:u=>safeUrl(u)?'':'El link tiene que empezar con https:// (copialo desde Drive o Dropbox).'},
      {id:'date',label:'Fecha',type:'date',value:fmtISO(today0())}],
      v=>{w.docs.push({id:uid(),...v,date:v.date||fmtISO(today0())});toast('Documento guardado')});
    case 'del-doc': {const d=find(w.docs,id);undoable(`Documento "${d.name}" quitado`,()=>{w.docs=w.docs.filter(x=>x.id!==id)});break}
    case 'studio': ui.scope='studio';ui.view='planner';break;
    case 'leads': ui.scope='leads';ui.view='planner';break;
    case 'archive': ui.showArchive=!ui.showArchive;break;
    case 'open': {const t=S.weddings.find(x=>x.id===id)||w;ui.scope='wedding';ui.wid=id;
      ui.msgT=null;ui.msgBody=null;
      if(t.status==='lead'){ui.view='planner';ui.tab='pareja'}else if(ui.view!=='portal')ui.tab='resumen';break}
    case 'close-wedding': {const t=S.weddings.find(x=>x.id===id);t.status='finalizada';ui.scope='studio';ui.showArchive=true;toast(`Boda de ${t.couple} archivada`);break}
    case 'reopen': {const t=S.weddings.find(x=>x.id===id);t.status='activa';toast('Boda reabierta');break}
    case 'convert': {const t=S.weddings.find(x=>x.id===id);activateLead(t);ui.scope='wedding';ui.wid=t.id;ui.tab='resumen';toast(`${t.couple} pasó a boda confirmada`);break}
    case 'drop-lead': {const t=S.weddings.find(x=>x.id===id);ui.scope='leads';
      undoable(`Consulta de ${t.couple} descartada`,()=>{S.weddings=S.weddings.filter(x=>x.id!==id)});break}
    case 'view': ui.view=b.dataset.v;ui.scope='wedding';break;
    case 'tab': ui.tab=b.dataset.t;ui.msgBody=null;break;
    case 'gfilter': ui.gFilter=b.dataset.f;break;
    case 'towner': ui.tOwner=b.dataset.o;break;
    case 'reset': {if(API())return;  // con backend borraría las bodas reales
      const before=JSON.stringify(S);
      S=seed();ui.wid=(active()[0]||S.weddings[0]).id;ui.scope='studio';ui.view='planner';save();
      toast('Datos de ejemplo restablecidos',{label:'Deshacer',run:()=>{S=JSON.parse(before);ui.wid=(active()[0]||S.weddings[0]).id;save();render()}});break}
    case 'del-guest': {const g=find(w.guests,id), ac=w.guests.filter(x=>x.plusOf===id);
      // el acompañante se va con su titular: si queda colgado, el servidor no lo puede guardar
      undoable(ac.length?`${g.name} y su acompañante quitados`:`${g.name} quitado de la lista`,()=>{w.guests=w.guests.filter(x=>x.id!==id&&x.plusOf!==id)});break}
    case 'unseat': find(w.guests,id).table=null;break;
    case 'add-table': w.tables++;toast(`Mesa ${w.tables} agregada`);break;
    case 'del-tl': {const x=find(w.timeline,id);undoable(`"${x.title}" quitado del cronograma`,()=>{w.timeline=w.timeline.filter(y=>y.id!==id)});break}
    case 'vmove': {const v=find(w.vendors,id);const i=VSTAT.indexOf(v.status)+Number(b.dataset.d);v.status=VSTAT[Math.max(0,Math.min(4,i))];syncExpense(w,v);toast(`${v.name}: ${VLABEL[v.status]}`);break}
    case 'approve': case 'reject': {const v=find(w.vendors,id), ok=a==='approve';
      const msg=ok?`Aprobaron ${v.name}. La planner ya lo ve.`:`Le pedimos otra opción a la planner para ${v.cat.toLowerCase()}`;
      if(isCouple()){b.disabled=true;
        AL().decide(w.id,v.id,a).then(()=>toast(msg),err=>toast(err.status===409?'Ese presupuesto ya no espera respuesta':`No se pudo guardar: ${err.message}`));return}
      v.status=ok?'aprobado':'contactado';if(ok)syncExpense(w,v);toast(msg);break}
    case 'copy-glink': {const g=find(w.guests,id), link=rsvpLink(w,g);
      (navigator.clipboard?.writeText(link)||Promise.reject()).then(()=>toast(`Link de ${firstName(g.name)} copiado: entra directo a su respuesta`),()=>toast(link));return}
    case 'copy-rsvp': {const link=rsvpLink(w);
      (navigator.clipboard?.writeText(link)||Promise.reject()).then(()=>toast('Link de RSVP copiado'),()=>toast(link));return}
    case 'open-rsvp': ui.rsvpOpened=false;location.hash=rsvpLink(w).split('#')[1];return;
    case 'edit-partners': {const [a,b2]=w.partners;return form('Contactos de la pareja',[
      {id:'n1',label:`Nombre de ${a.role.toLowerCase()}`,value:a.name,req:1},{id:'p1',label:'Teléfono',value:a.phone,ph:'+54 381 …'},{id:'e1',label:'Mail',type:'email',value:a.email},{id:'i1',label:'Instagram',value:a.ig,ph:'@usuario'},
      {id:'n2',label:`Nombre de ${b2.role.toLowerCase()}`,value:b2.name,req:1},{id:'p2',label:'Teléfono',value:b2.phone,ph:'+54 381 …'},{id:'e2',label:'Mail',type:'email',value:b2.email},{id:'i2',label:'Instagram',value:b2.ig,ph:'@usuario'}],
      v=>{Object.assign(a,{name:v.n1,phone:v.p1,email:v.e1,ig:v.i1});Object.assign(b2,{name:v.n2,phone:v.p2,email:v.e2,ig:v.i2});
        w.couple=`${firstName(v.n1)} & ${firstName(v.n2)}`;w.slug=slugify(w.couple);toast('Contactos actualizados')})}
    case 'edit-profile': {const P=w.profile;return form('Sobre la pareja',[
      {id:'how',label:'Cómo se conocieron',type:'textarea',value:P.how,ph:'Dónde, cuándo, cómo llegaron hasta acá'},
      {id:'palette',label:'Paleta y estilo',value:P.palette,ph:'Ej: verde oliva, crema y terracota'},
      {id:'song',label:'Canción del vals',value:P.song},
      {id:'witnesses',label:'Testigos',value:P.witnesses},
      {id:'address',label:'Dirección de contacto',value:P.address},
      {id:'notes',label:'Notas internas',type:'textarea',rows:4,value:P.notes,ph:'Lo que conviene tener a mano: manías, familia complicada, alergias…'}],
      v=>{Object.assign(P,v);toast('Ficha actualizada')})}
    case 'edit-faq': {const F=w.profile.faq;return form('Preguntas de los invitados',[
      {id:'dress',label:'Vestimenta',type:'textarea',rows:2,value:F.dress,ph:'Ej: Elegante sport. La ceremonia es en el jardín.'},
      {id:'gifts',label:'Regalos',type:'textarea',rows:2,value:F.gifts,ph:'Lista, alias, o que no esperan regalos'},
      {id:'kids',label:'¿Van chicos?',type:'textarea',rows:2,value:F.kids,ph:'Ej: Solo adultos, con niñera en el salón de al lado'},
      {id:'lodging',label:'Alojamiento',type:'textarea',rows:2,value:F.lodging},
      {id:'transport',label:'Traslados y estacionamiento',type:'textarea',rows:2,value:F.transport},
      {id:'extra',label:'Otros datos',type:'textarea',rows:2,value:F.extra}],
      v=>{Object.assign(F,v);toast('El asistente ya responde con esto')})}
    case 'edit-contract': return form('Contrato del estudio',[
      {id:'plan',label:'Tipo de servicio',type:'select',options:PLANS.concat('A presupuestar'),value:w.contract.plan},
      {id:'fee',label:'Honorarios totales (ARS)',type:'number',value:fees(w).fee,min:0,req:1},
      {id:'signed',label:'Fecha de firma',type:'date',value:w.contract.signed||''}],
      v=>{w.contract.plan=v.plan;w.contract.signed=v.signed||null;rescaleFee(w,+v.fee||0);toast('Contrato actualizado')});
    case 'make-contract': w.contract=makeContract({plan:w.contract.plan==='A presupuestar'?'Full planning':w.contract.plan,p:0},w.date,w.contract.fee);toast('Contrato cargado en 3 cuotas');break;
    case 'add-installment': return form('Nueva cuota',[
      {id:'label',label:'Concepto',req:1,ph:'Ej: Tercer pago'},
      {id:'amount',label:'Monto (ARS)',type:'number',req:1,min:0},
      {id:'due',label:'Vence',type:'date',value:addDays(fmtISO(today0()),30),req:1}],
      v=>{w.contract.installments.push({id:uid(),label:v.label,amount:+v.amount||0,due:v.due,paid:false,paidOn:null});
        w.contract.fee=sum(w.contract.installments,i=>i.amount);toast('Cuota agregada')});
    case 'charge': {const i=w.contract.installments.find(x=>x.id===id);i.paid=true;i.paidOn=fmtISO(today0());
      if(!w.contract.signed)w.contract.signed=i.paidOn;
      w.log.unshift({id:uid(),date:i.paidOn,kind:'Nota',title:`Cobro: ${i.label}`,body:`Se registró el cobro de ${money(i.amount)}.`});
      toast(`Cobrado ${money(i.amount)}`);break}
    case 'add-meet': return form('Nueva reunión',[
      {id:'title',label:'Motivo',req:1,ph:'Ej: Reunión de avance'},
      {id:'kind',label:'Tipo',type:'select',options:MEETKIND},
      {id:'date',label:'Fecha',type:'date',value:addDays(fmtISO(today0()),7),req:1},
      {id:'time',label:'Hora',type:'time',value:'17:00',req:1},
      {id:'place',label:'Dónde',value:'Oficina del estudio'}],
      v=>{w.meetings.push({id:uid(),...v,done:false});toast('Reunión agendada')});
    case 'meet-done': {const m=w.meetings.find(x=>x.id===id);m.done=true;toast('Reunión marcada como hecha');break}
    case 'del-meet': {const m=find(w.meetings,id);undoable(`Reunión "${m.title}" quitada`,()=>{w.meetings=w.meetings.filter(x=>x.id!==id)});break}
    case 'add-log': return form('Nueva nota en la bitácora',[
      {id:'title',label:'Título',req:1,ph:'Ej: Llamada por el catering'},
      {id:'kind',label:'Tipo',type:'select',options:LOGKIND},
      {id:'date',label:'Fecha',type:'date',value:fmtISO(today0()),req:1},
      {id:'body',label:'Qué pasó',type:'textarea',rows:4,req:1,ph:'Lo que se habló y lo que quedó pendiente'}],
      v=>{w.log.push({id:uid(),...v});toast('Nota guardada en la bitácora')});
    case 'del-log': {const l=find(w.log,id);undoable(`Nota "${l.title}" borrada`,()=>{w.log=w.log.filter(x=>x.id!==id)});break}
    case 'new-lead': return form('Nueva consulta',[
      {id:'n1',label:'Nombre de la novia',req:1,ph:'Ej: Agustina Robles'},
      {id:'n2',label:'Nombre del novio',req:1,ph:'Ej: Ramiro Ledesma'},
      {id:'phone',label:'Teléfono de contacto',ph:'+54 381 …'},
      {id:'email',label:'Mail de contacto',type:'email'},
      {id:'src',label:'Llegó por',type:'select',options:LEADSRC},
      {id:'date',label:'Fecha tentativa',type:'date',value:addDays(fmtISO(today0()),330),req:1},
      {id:'city',label:'Zona',value:'San Miguel de Tucumán'},
      {id:'target',label:'Invitados estimados',type:'number',value:120,min:1},
      {id:'budget',label:'Presupuesto estimado (ARS)',type:'number',value:30000000,min:0},
      {id:'note',label:'Qué pidieron',type:'textarea',rows:3,ph:'Lo que contaron en el primer contacto'}],
      v=>{const l=buildLead({couple:`${firstName(v.n1)} & ${firstName(v.n2)}`,city:v.city,target:+v.target||100,budget:+v.budget||0,
            src:v.src,first:0,note:v.note||'Sin detalles cargados.',
            p1:{name:v.n1,phone:v.phone,email:v.email,ig:''},p2:{name:v.n2,phone:'',email:'',ig:''}},v.date);
        S.weddings.push(l);ui.scope='leads';toast(`Consulta de ${l.couple} registrada`)},'Registrar consulta');
    case 'add-guest': return form('Nuevo invitado',[{id:'name',label:'Nombre y apellido',req:1,ph:'Ej: Carolina Terán'},{id:'side',label:'Invitado de',type:'select',options:['Novia','Novio']},{id:'group',label:'Grupo',type:'select',options:['Familia','Amigos','Trabajo','Facultad']},{id:'rsvp',label:'RSVP',type:'select',options:Object.entries(RSVP),value:'pendiente'},{id:'diet',label:'Menú',type:'select',options:[['','Estándar'],'Vegetariano','Vegano','Celíaco']},{id:'plus',label:'¿Puede venir con acompañante?',type:'select',options:[['no','No'],['si','Sí']],value:'no'},{id:'phone',label:'Teléfono',ph:'+54 381 …'}],v=>{w.guests.unshift({id:uid(),name:v.name,side:v.side,group:v.group,rsvp:v.rsvp,diet:v.diet,table:null,kind:'adulto',plus:v.plus==='si',plusOf:null,phone:v.phone,token:tok()});ui.gFilter='todos';ui.gQuery='';toast(`${v.name} agregado a la lista`)},'Agregar invitado');
    case 'add-expense': return form('Nuevo gasto',[{id:'concept',label:'Concepto',req:1,ph:'Ej: Cabina de fotos'},{id:'cat',label:'Categoría',type:'select',options:[...new Set(w.vendors.map(v=>v.cat).concat('Otros'))]},{id:'total',label:'Monto total (ARS)',type:'number',req:1,min:0},{id:'paid',label:'Ya pagado (ARS)',type:'number',value:0,min:0},{id:'due',label:'Vencimiento',type:'date',value:addDays(w.date,-10)}],v=>{w.expenses.push({id:uid(),concept:v.concept,cat:v.cat,vendorId:null,total:+v.total,paid:Math.min(+v.paid||0,+v.total),due:v.due||addDays(w.date,-10)});toast('Gasto agregado')},'Agregar gasto');
    case 'pay': {const ex=find(w.expenses,id);return form(`Pago a ${esc(ex.concept)}`,[{id:'amt',label:`Monto (saldo ${money(ex.total-ex.paid)})`,type:'number',value:ex.total-ex.paid,min:1,req:1}],v=>{ex.paid=Math.min(ex.total,ex.paid+(+v.amt||0));toast(ex.paid>=ex.total?'Pagado completo':`Pago registrado · resta ${money(ex.total-ex.paid)}`)},'Registrar pago')}
    case 'add-vendor': return form('Nuevo proveedor',[{id:'name',label:'Nombre',req:1},{id:'cat',label:'Rubro',type:'select',options:['Salón / lugar','Catering','Fotografía y video','DJ / Música','Ambientación y flores','Vestido y traje','Torta y mesa dulce','Peinado y maquillaje','Invitaciones','Transporte','Cabina de fotos','Otros']},{id:'contact',label:'Contacto',ph:'Nombre de la persona'},{id:'phone',label:'Teléfono',ph:'+54 381 …'},{id:'amount',label:'Presupuesto (ARS)',type:'number',value:0,min:0}],v=>{w.vendors.push({id:uid(),...v,amount:+v.amount||0,status:'contactado'});ui.tab='proveedores';toast(`${v.name} agregado como contactado`)},'Agregar proveedor');
    case 'add-task': return form('Nueva tarea',[{id:'title',label:'Tarea',req:1,ph:'Ej: Confirmar cabina de fotos'},{id:'owner',label:'A cargo de',type:'select',options:[['planner','Planner'],['novios','Novios']]},{id:'cat',label:'Categoría',value:'General'},{id:'due',label:'Fecha límite',type:'date',value:addDays(fmtISO(today0()),14),req:1}],v=>{w.tasks.push({id:uid(),...v,done:false});toast('Tarea agregada')},'Agregar tarea');
    case 'add-tl': return form('Nuevo momento',[{id:'time',label:'Hora',type:'time',value:'21:00',req:1},{id:'title',label:'Momento',req:1,ph:'Ej: Sorpresa de amigos'},{id:'place',label:'Lugar',value:'Salón principal'},{id:'who',label:'Responsable',value:'Planner'}],v=>{w.timeline.push({id:uid(),...v,key:false});toast('Momento agregado al cronograma')},'Agregar');
    case 'new-wedding': return form('Nueva boda',[{id:'couple',label:'Novios',req:1,ph:'Ej: Julieta & Franco'},{id:'date',label:'Fecha',type:'date',value:addDays(fmtISO(today0()),240),req:1},{id:'venue',label:'Lugar',value:'A definir'},{id:'city',label:'Ciudad',value:'San Miguel de Tucumán'},{id:'target',label:'Invitados estimados',type:'number',value:100,min:1},{id:'budget',label:'Presupuesto (ARS)',type:'number',value:25000000,min:0}],v=>{
        if(!v.couple.includes('&'))v.couple=v.couple.replace(/\s+y\s+/i,' & ');
        const nw=buildWedding({couple:v.couple,venue:v.venue,city:v.city,target:+v.target||100,budget:+v.budget||0,style:'Por definir',p:0,s:Date.now()%1e6},v.date);
        nw.guests=[];nw.expenses=[];nw.vendors.forEach(x=>x.status='contactado');S.weddings.push(nw);ui.wid=nw.id;ui.scope='wedding';ui.tab='resumen';toast(`Boda de ${v.couple} creada con checklist base`)},'Crear boda');
  }
  save();render();
});
/* una consulta que se confirma: se le arma el esqueleto de boda */
function activateLead(w){
  const base=buildWedding({couple:w.couple,venue:w.venue,city:w.city,target:w.target,budget:w.budget,style:w.style,p:0,s:Date.now()%1e6,plan:w.contract.plan},w.date);
  w.status='activa';
  w.tasks=base.tasks;w.timeline=base.timeline;
  w.vendors=base.vendors.map(v=>({...v,status:'contactado'}));
  w.guests=[];w.expenses=[];
  w.meetings=w.meetings.concat(base.meetings);
  if(!w.contract.installments.length)w.contract=makeContract({plan:w.contract.plan==='A presupuestar'?'Full planning':w.contract.plan,p:0},w.date,w.contract.fee);
  delete w.lead;
  w.log.unshift({id:uid(),date:fmtISO(today0()),kind:'Nota',title:'Pasó a boda confirmada',
    body:'Se cargó el checklist base, el cronograma del día y los proveedores a contactar.'});
}
/* cambiar el total de honorarios redistribuye lo que todavía no se cobró */
function rescaleFee(w,nf){
  const ins=w.contract.installments;w.contract.fee=nf;
  if(!ins.length)return;
  const cobrado=sum(ins.filter(i=>i.paid),i=>i.amount), resto=Math.max(0,nf-cobrado);
  const un=ins.filter(i=>!i.paid), viejo=sum(un,i=>i.amount)||1;
  un.forEach((i,k)=>{i.amount=k===un.length-1?resto-sum(un.slice(0,k),x=>x.amount):Math.round(i.amount/viejo*resto/1000)*1000});
}
/* link general (busca por nombre) o personal (entra directo); con backend el
   general lleva el id de la boda porque dos bodas pueden tener el mismo slug */
const rsvpBase=()=>location.origin+location.pathname;
const rsvpLink=(w,g)=>rsvpBase()+'#rsvp/'+w.slug+(g&&g.token?'/'+g.token:API()?'/'+w.id:'');
function syncExpense(w,v){
  const has=w.expenses.find(x=>x.vendorId===v.id);
  if(VSTAT.indexOf(v.status)>=2&&!has&&v.amount>0)w.expenses.push({id:uid(),concept:v.name,cat:v.cat,vendorId:v.id,total:v.amount,paid:0,due:addDays(w.date,-10)});
}
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('wcard')){e.preventDefault();e.target.click()}
  if(e.key==='Enter'&&e.target.id==='botq'){e.preventDefault();document.querySelector('[data-a="bot-send"]')?.click()}
});
document.addEventListener('change',e=>{
  const c=e.target.dataset.c;if(!c||c==='gq'||c==='rq')return;const w=W(),id=e.target.dataset.id;
  if(c==='rsvp'){const g=find(w.guests,id);g.rsvp=e.target.value;if(g.rsvp!=='si')g.table=null}
  if(c==='table'){find(w.guests,id).table=e.target.value?+e.target.value:null}
  if(c==='task'){const t=find(w.tasks,id);
    if(isCouple()){e.target.disabled=true;AL().taskDone(w.id,t.id,e.target.checked)
      .then(()=>{if(e.target.checked)toast('Tarea completada')},err=>toast(`No se pudo guardar: ${err.message}`));return}
    t.done=e.target.checked;if(t.done)toast('Tarea completada')}
  if(c==='mselect'){const v=e.target.value;
    if(v==='studio'||v==='leads'||v==='negocio'){ui.scope=v;ui.view='planner'}
    else{ui.scope='wedding';ui.wid=v;ui.tab='resumen'}}
  save();render();
});
document.addEventListener('input',e=>{
  const c=e.target.dataset.c;
  if(c==='gq'){ui.gQuery=e.target.value;ui.focus='gq';render()}
  if(c==='rq'){ui.rsvpQuery=e.target.value;ui.focus='rq';if(ui.rsvp==='remote')searchPublic(norm(ui.rsvpQuery.trim()));render()}
  if(c==='msgbody'){ui.msgBody=e.target.value}
});

/* ================= arranque ================= */
document.addEventListener('submit',e=>{
  const f=e.target.closest('[data-bot]');if(!f)return;e.preventDefault();
  const q=f.querySelector('#botq').value.trim();if(!q)return;
  ui.botLog.push({id:'libre',q,a:botAnswer(rsvpWedding(),q)});ui.focus='botq';render();
});
/* tarjetas clickeables con teclado: Enter o Espacio hacen lo mismo que el click */
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[tabindex][data-a]')){e.preventDefault();e.target.click()}
});

/* el servidor manda bodas nuevas: respuestas de invitados, decisiones de los
   novios o la versión elegida en un conflicto */
const fromServer=list=>migrate({weddings:list,v:1}).weddings;
function onRemote({all,replace}){
  if(all)S={weddings:fromServer(all),v:5};
  if(replace)fromServer(replace).forEach(fw=>{const i=S.weddings.findIndex(x=>x.id===fw.id);if(i>=0)S.weddings[i]=fw;else S.weddings.push(fw)});
  if(!S.weddings.some(w=>w.id===ui.wid))ui.wid=(active()[0]||S.weddings[0]||{}).id;
  save();render();
}
function boot(){
  const A=AL();
  A.onStatus=paintSync;A.onRemote=onRemote;A.onConflict=conflictDialog;
  let got=false;
  A.start(st=>{
    got=true;
    S={weddings:fromServer(st.weddings||[]),v:5};
    ui.wid=(active()[0]||S.weddings[0]||{}).id;
    ui.scope=isCouple()?'wedding':'studio';ui.view=isCouple()?'portal':'planner';
    ui.booting=false;save();render();
  }).then(()=>{
    // base vacía y nada en el navegador: se arranca de cero, no con los datos de ejemplo
    if(!got&&API()&&AL().user)S={weddings:[],v:5};
    if(ui.booting){ui.booting=false;render()}
  });
}

/* Entrada: dos anillos que se dibujan y se enlazan (eso es una alianza) y la
   marca. Una vez por sesión, se saltea con click o tecla y no corre con
   movimiento reducido. Si el script falla, la app ya está dibujada abajo. */
function intro(){
  let seen=false;try{seen=sessionStorage.getItem('alianza-intro')==='1';sessionStorage.setItem('alianza-intro','1')}catch(e){}
  if(seen||ui.rsvp||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const el=document.createElement('div');el.className='intro';el.setAttribute('aria-hidden','true');
  el.innerHTML=`<div class="intro-mark">
    <svg viewBox="0 0 120 64"><circle class="r1" cx="46" cy="32" r="24"/><circle class="r2" cx="74" cy="32" r="24"/><path class="r1-front" d="M60 12.51A24 24 0 0 1 70 32"/></svg>
    <b>Alianza</b><span>wedding studio</span></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('intro-on');
  let gone=false;
  const end=()=>{if(gone)return;gone=true;el.classList.add('out');document.documentElement.classList.remove('intro-on');
    setTimeout(()=>el.remove(),520);removeEventListener('keydown',end);};
  el.addEventListener('click',end);addEventListener('keydown',end);
  setTimeout(end,1650);
}

ui.booting=API()&&!ui.rsvp;
intro();
render();
if(ui.booting)boot();
else if(API()&&ui.rsvp==='remote'){AL().onStatus=paintSync}
})();
