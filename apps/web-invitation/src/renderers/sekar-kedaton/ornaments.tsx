import type {CSSProperties} from 'react';
import s from './sekar-kedaton.module.css';

const courtyard = '/templates/sekar-kedaton/joglo-courtyard.png';
const tree = '/templates/sekar-kedaton/frangipani-tree.png';
const flowers = '/templates/sekar-kedaton/jasmine-janur.png';

export function Gunungan({className=''}:{className?:string}){
 return <svg className={`${s.gunungan} ${className}`} viewBox="0 0 180 260" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M90 8C77 49 16 91 15 158L30 212H150L165 158C164 91 103 49 90 8Z"/><path d="M90 27C75 63 30 105 28 157L40 199H140L152 157C150 105 105 63 90 27Z"/><path d="M90 65V181M90 100Q65 95 60 73M90 119Q117 108 122 85M90 138Q55 131 46 106M90 155Q125 147 137 120M90 175Q63 160 53 144M90 175Q119 172 130 151M77 181L90 163L103 181M40 186H140M42 194H138M90 214V251M82 250H98"/><path d="M48 66Q36 111 33 154M132 66Q144 111 147 154" strokeDasharray="1 6"/>{[50,70,90,110,130].map(x=><path key={x} d={`M${x} 205l5 5-5 5-5-5Z`}/>)}<circle cx="90" cy="51" r="4"/><path d="M56 120q-12-12-10-20 13 0 15 13M117 103q10-13 9-21-13 1-17 15M61 151q-13-8-15-19 15-1 19 11M113 159q17-7 20-19-15-1-22 13"/></svg>;
}

export function Kawung({className=''}:{className?:string}){
 return <svg viewBox="0 0 180 90" className={`${s.kawung} ${className}`} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth=".8">{[0,60,120].map(x=><g key={x} transform={`translate(${x+30} 45)`}><ellipse rx="10" ry="22" transform="translate(-11 -12) rotate(-40)"/><ellipse rx="10" ry="22" transform="translate(11 -12) rotate(40)"/><ellipse rx="10" ry="22" transform="translate(-11 12) rotate(40)"/><ellipse rx="10" ry="22" transform="translate(11 12) rotate(-40)"/><circle r="2"/></g>)}</svg>;
}

export function Petals(){return <div className={s.petals} aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--n':i,left:`${i*8.5}%`} as CSSProperties}/>)}</div>;}

export function Florals({className=''}:{className?:string}){return <div className={`${s.florals} ${className}`} aria-hidden="true"><img src={flowers} alt="" className={s.flowerLeft}/><img src={flowers} alt="" className={s.flowerRight}/></div>;}

export function Scene({intro=false}:{intro?:boolean}){return <div className={`${s.scene} ${intro?s.introScene:''}`} aria-hidden="true"><img className={s.courtyard} src={courtyard} alt=""/><span className={s.sunlight}/><div className={s.treeLeft}><img src={tree} alt=""/></div><div className={s.treeRight}><img src={tree} alt=""/></div><Florals/><div className={s.water}><i/><i/><i/></div><span className={s.haze}/><Petals/></div>;}
