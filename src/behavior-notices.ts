/** Korte kommentarer til nye aktiviteter; højst én aktuel besked pr. and. */
import type {DuckKind,DuckState} from './types';

export const DUCK_NAMES: Record<DuckKind, string> = {
  drake: 'Anders',
  buff: 'Andemette',
  brown: 'Andedorte',
  pied: 'Andja',
};
const names: Record<DuckKind, string> = DUCK_NAMES;
export const DUCK_ACTIONS: Record<DuckState, string> = {
 wander:'går en tur',notice:'får øje på foder',approach:'går hen til foderet',eat:'spiser',
 guard:'holder vagt',rest:'hviler sig',preen:'pudser fjer',sleep:'lægger sig til at sove',
 forage:'søger føde i græsset',drink:'drikker',chase:'jager insekter',retreat:'trækker sig lidt væk',
 swim:'svømmer',enter:'går i bad',exit:'går op af badet',
};
const actions = DUCK_ACTIONS;
type Bird={id:string;kind:DuckKind;state:DuckState};
const BEHAVIOR_QUIET_MS=15_000;
export class BehaviorNotices{
 private previous=new Map<string,DuckState>();
 private lastSeen=new Map<DuckState,number>();
 private active=new Map<string,{node:HTMLLIElement;expires:number}>();
 constructor(private container:HTMLElement){}
 clear(){this.container.replaceChildren();this.active.clear();}
 update(ducks:readonly Bird[],now:number,enabled:boolean){
  if(!enabled&&this.active.size)this.clear();
  for(const [id,notice] of this.active){if(now>=notice.expires){notice.node.remove();this.active.delete(id);}}
  for(const duck of ducks){
   const before=this.previous.get(duck.id);this.previous.set(duck.id,duck.state);
   // Første observation er udgangspunktet, ikke en ny aktivitet.
   if(!enabled||before===undefined||before===duck.state)continue;
   // Kun første and annonceres. En aktivitet skal have været væk fra hele
   // flokken i 15 sekunder, før den igen regnes som en ny episode.
   if(now-(this.lastSeen.get(duck.state)??-Infinity)<BEHAVIOR_QUIET_MS)continue;
   this.lastSeen.set(duck.state,now);
   this.active.get(duck.id)?.node.remove();
   const node=document.createElement('li');
   node.textContent=`${names[duck.kind]} ${actions[duck.state]}.`;
   this.container.append(node);this.active.set(duck.id,{node,expires:now+5000});
  }
  // Også fortsat adfærd og aktivitet med kommentarer slået fra tæller med.
  for(const duck of ducks)this.lastSeen.set(duck.state,now);
 }
}
