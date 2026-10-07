export const GOATCOUNTER_ENDPOINT='https://gistrup-andetv.goatcounter.com/count';

/** Only the published garden is counted; query strings never create extra pages. */
export function analyticsPage(location:Pick<Location,'hostname'|'protocol'|'pathname'>):string|null{
 if(location.protocol!=='https:'||location.hostname!=='krauhe.github.io')return null;
 return ['/DuckTV','/DuckTV/','/DuckTV/index.html'].includes(location.pathname)?'/DuckTV/':null;
}

export function startAnalytics(endpoint=GOATCOUNTER_ENDPOINT):void{
 const path=analyticsPage(window.location);
 if(!path||!endpoint||document.querySelector('script[data-goatcounter]'))return;
 const target=window as Window & {goatcounter?:{path:()=>string;title:string;no_events:boolean}};
 target.goatcounter={path:()=>path,title:'Gistrup Ande TV',no_events:true};
 const script=document.createElement('script');
 script.dataset.goatcounter=endpoint;script.async=true;
 script.src='https://gc.zgo.at/count.js';document.head.appendChild(script);
}
