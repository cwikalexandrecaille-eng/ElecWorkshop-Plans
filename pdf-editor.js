(()=>{
'use strict';
const PREFIX='EW_DRAW_V1:', clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const E=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e};
const BUILTIN_SYMBOLS=[{"id":"builtin:disjoncteur","slug":"disjoncteur","name":"Disjoncteur 1P","category":"Protection","paths":[["r",0.485,0.035,0.03,0.03],["l",0.5,0.065,0.5,0.18],["l",0.48,0.16,0.52,0.2],["l",0.52,0.16,0.48,0.2],["l",0.425,0.235,0.5,0.43],["l",0.5,0.43,0.5,0.61],["l",0.5,0.61,0.553,0.61],["l",0.553,0.61,0.553,0.685],["l",0.553,0.685,0.5,0.685],["b",0.5,0.685,0.594,0.685,0.594,0.78,0.5,0.78],["l",0.5,0.78,0.5,0.935],["r",0.485,0.935,0.03,0.03]],"active":true},{"id":"builtin:disjoncteur-1pn","slug":"disjoncteur-1pn","name":"Disjoncteur 1P + N","category":"Protection","paths":[["r",0.325,0.035,0.03,0.03],["l",0.34,0.065,0.34,0.18],["l",0.32,0.16,0.36,0.2],["l",0.36,0.16,0.32,0.2],["l",0.265,0.235,0.34,0.43],["l",0.34,0.43,0.34,0.61],["r",0.325,0.935,0.03,0.03],["r",0.645,0.035,0.03,0.03],["l",0.66,0.065,0.66,0.18],["l",0.64,0.16,0.68,0.2],["l",0.68,0.16,0.64,0.2],["l",0.585,0.235,0.66,0.43],["l",0.66,0.43,0.66,0.61],["l",0.66,0.61,0.713,0.61],["l",0.713,0.61,0.713,0.685],["l",0.713,0.685,0.66,0.685],["b",0.66,0.685,0.754,0.685,0.754,0.78,0.66,0.78],["l",0.66,0.78,0.66,0.935],["r",0.645,0.935,0.03,0.03],["d",0.26,0.365,0.715,0.365],["l",0.34,0.61,0.34,0.935]],"active":true},{"id":"builtin:disjoncteur-2p","slug":"disjoncteur-2p","name":"Disjoncteur 2P","category":"Protection","paths":[["r",0.325,0.035,0.03,0.03],["l",0.34,0.065,0.34,0.18],["l",0.32,0.16,0.36,0.2],["l",0.36,0.16,0.32,0.2],["l",0.265,0.235,0.34,0.43],["l",0.34,0.43,0.34,0.61],["l",0.34,0.61,0.393,0.61],["l",0.393,0.61,0.393,0.685],["l",0.393,0.685,0.34,0.685],["b",0.34,0.685,0.434,0.685,0.434,0.78,0.34,0.78],["l",0.34,0.78,0.34,0.935],["r",0.325,0.935,0.03,0.03],["r",0.645,0.035,0.03,0.03],["l",0.66,0.065,0.66,0.18],["l",0.64,0.16,0.68,0.2],["l",0.68,0.16,0.64,0.2],["l",0.585,0.235,0.66,0.43],["l",0.66,0.43,0.66,0.61],["l",0.66,0.61,0.713,0.61],["l",0.713,0.61,0.713,0.685],["l",0.713,0.685,0.66,0.685],["b",0.66,0.685,0.754,0.685,0.754,0.78,0.66,0.78],["l",0.66,0.78,0.66,0.935],["r",0.645,0.935,0.03,0.03],["d",0.26,0.365,0.715,0.365]],"active":true},{"id":"builtin:disjoncteur-diff-2p","slug":"disjoncteur-diff-2p","name":"Disjoncteur différentiel 2P","category":"Protection","paths":[["r",0.325,0.035,0.03,0.03],["l",0.34,0.065,0.34,0.18],["l",0.32,0.16,0.36,0.2],["l",0.36,0.16,0.32,0.2],["l",0.265,0.235,0.34,0.43],["l",0.34,0.43,0.34,0.61],["l",0.34,0.61,0.393,0.61],["l",0.393,0.61,0.393,0.685],["l",0.393,0.685,0.34,0.685],["b",0.34,0.685,0.434,0.685,0.434,0.78,0.34,0.78],["l",0.34,0.78,0.34,0.935],["r",0.325,0.935,0.03,0.03],["r",0.645,0.035,0.03,0.03],["l",0.66,0.065,0.66,0.18],["l",0.64,0.16,0.68,0.2],["l",0.68,0.16,0.64,0.2],["l",0.585,0.235,0.66,0.43],["l",0.66,0.43,0.66,0.61],["l",0.66,0.61,0.713,0.61],["l",0.713,0.61,0.713,0.685],["l",0.713,0.685,0.66,0.685],["b",0.66,0.685,0.754,0.685,0.754,0.78,0.66,0.78],["l",0.66,0.78,0.66,0.935],["r",0.645,0.935,0.03,0.03],["d",0.26,0.365,0.715,0.365],["d",0.22,0.33,0.78,0.33],["d",0.22,0.33,0.22,0.82],["d",0.22,0.82,0.78,0.82],["d",0.22,0.55,0.78,0.55],["d",0.22,0.73,0.78,0.73],["e",0.5,0.56,0.265,0.052]],"active":true},{"id":"builtin:disjoncteur-3p","slug":"disjoncteur-3p","name":"Disjoncteur 3P","category":"Protection","paths":[["r",0.205,0.035,0.03,0.03],["l",0.22,0.065,0.22,0.18],["l",0.2,0.16,0.24,0.2],["l",0.24,0.16,0.2,0.2],["l",0.145,0.235,0.22,0.43],["l",0.22,0.43,0.22,0.61],["l",0.22,0.61,0.273,0.61],["l",0.273,0.61,0.273,0.685],["l",0.273,0.685,0.22,0.685],["b",0.22,0.685,0.314,0.685,0.314,0.78,0.22,0.78],["l",0.22,0.78,0.22,0.935],["r",0.205,0.935,0.03,0.03],["r",0.485,0.035,0.03,0.03],["l",0.5,0.065,0.5,0.18],["l",0.48,0.16,0.52,0.2],["l",0.52,0.16,0.48,0.2],["l",0.425,0.235,0.5,0.43],["l",0.5,0.43,0.5,0.61],["l",0.5,0.61,0.553,0.61],["l",0.553,0.61,0.553,0.685],["l",0.553,0.685,0.5,0.685],["b",0.5,0.685,0.594,0.685,0.594,0.78,0.5,0.78],["l",0.5,0.78,0.5,0.935],["r",0.485,0.935,0.03,0.03],["r",0.765,0.035,0.03,0.03],["l",0.78,0.065,0.78,0.18],["l",0.76,0.16,0.8,0.2],["l",0.8,0.16,0.76,0.2],["l",0.705,0.235,0.78,0.43],["l",0.78,0.43,0.78,0.61],["l",0.78,0.61,0.833,0.61],["l",0.833,0.61,0.833,0.685],["l",0.833,0.685,0.78,0.685],["b",0.78,0.685,0.874,0.685,0.874,0.78,0.78,0.78],["l",0.78,0.78,0.78,0.935],["r",0.765,0.935,0.03,0.03],["d",0.14,0.365,0.835,0.365]],"active":true},{"id":"builtin:disjoncteur-diff-3p","slug":"disjoncteur-diff-3p","name":"Disjoncteur différentiel 3P","category":"Protection","paths":[["r",0.205,0.035,0.03,0.03],["l",0.22,0.065,0.22,0.18],["l",0.2,0.16,0.24,0.2],["l",0.24,0.16,0.2,0.2],["l",0.145,0.235,0.22,0.43],["l",0.22,0.43,0.22,0.61],["l",0.22,0.61,0.273,0.61],["l",0.273,0.61,0.273,0.685],["l",0.273,0.685,0.22,0.685],["b",0.22,0.685,0.314,0.685,0.314,0.78,0.22,0.78],["l",0.22,0.78,0.22,0.935],["r",0.205,0.935,0.03,0.03],["r",0.485,0.035,0.03,0.03],["l",0.5,0.065,0.5,0.18],["l",0.48,0.16,0.52,0.2],["l",0.52,0.16,0.48,0.2],["l",0.425,0.235,0.5,0.43],["l",0.5,0.43,0.5,0.61],["l",0.5,0.61,0.553,0.61],["l",0.553,0.61,0.553,0.685],["l",0.553,0.685,0.5,0.685],["b",0.5,0.685,0.594,0.685,0.594,0.78,0.5,0.78],["l",0.5,0.78,0.5,0.935],["r",0.485,0.935,0.03,0.03],["r",0.765,0.035,0.03,0.03],["l",0.78,0.065,0.78,0.18],["l",0.76,0.16,0.8,0.2],["l",0.8,0.16,0.76,0.2],["l",0.705,0.235,0.78,0.43],["l",0.78,0.43,0.78,0.61],["l",0.78,0.61,0.833,0.61],["l",0.833,0.61,0.833,0.685],["l",0.833,0.685,0.78,0.685],["b",0.78,0.685,0.874,0.685,0.874,0.78,0.78,0.78],["l",0.78,0.78,0.78,0.935],["r",0.765,0.935,0.03,0.03],["d",0.14,0.365,0.835,0.365],["d",0.1,0.33,0.9,0.33],["d",0.1,0.33,0.1,0.82],["d",0.1,0.82,0.9,0.82],["d",0.1,0.55,0.9,0.55],["d",0.1,0.73,0.9,0.73],["e",0.5,0.56,0.385,0.052]],"active":true},{"id":"builtin:disjoncteur-4p","slug":"disjoncteur-4p","name":"Disjoncteur 4P","category":"Protection","paths":[["r",0.135,0.035,0.03,0.03],["l",0.15,0.065,0.15,0.18],["l",0.13,0.16,0.17,0.2],["l",0.17,0.16,0.13,0.2],["l",0.075,0.235,0.15,0.43],["l",0.15,0.43,0.15,0.61],["l",0.15,0.61,0.203,0.61],["l",0.203,0.61,0.203,0.685],["l",0.203,0.685,0.15,0.685],["b",0.15,0.685,0.244,0.685,0.244,0.78,0.15,0.78],["l",0.15,0.78,0.15,0.935],["r",0.135,0.935,0.03,0.03],["r",0.368,0.035,0.03,0.03],["l",0.383,0.065,0.383,0.18],["l",0.363,0.16,0.403,0.2],["l",0.403,0.16,0.363,0.2],["l",0.308,0.235,0.383,0.43],["l",0.383,0.43,0.383,0.61],["l",0.383,0.61,0.436,0.61],["l",0.436,0.61,0.436,0.685],["l",0.436,0.685,0.383,0.685],["b",0.383,0.685,0.477,0.685,0.477,0.78,0.383,0.78],["l",0.383,0.78,0.383,0.935],["r",0.368,0.935,0.03,0.03],["r",0.602,0.035,0.03,0.03],["l",0.617,0.065,0.617,0.18],["l",0.597,0.16,0.637,0.2],["l",0.637,0.16,0.597,0.2],["l",0.542,0.235,0.617,0.43],["l",0.617,0.43,0.617,0.61],["l",0.617,0.61,0.67,0.61],["l",0.67,0.61,0.67,0.685],["l",0.67,0.685,0.617,0.685],["b",0.617,0.685,0.711,0.685,0.711,0.78,0.617,0.78],["l",0.617,0.78,0.617,0.935],["r",0.602,0.935,0.03,0.03],["r",0.835,0.035,0.03,0.03],["l",0.85,0.065,0.85,0.18],["l",0.83,0.16,0.87,0.2],["l",0.87,0.16,0.83,0.2],["l",0.775,0.235,0.85,0.43],["l",0.85,0.43,0.85,0.61],["l",0.85,0.61,0.903,0.61],["l",0.903,0.61,0.903,0.685],["l",0.903,0.685,0.85,0.685],["b",0.85,0.685,0.944,0.685,0.944,0.78,0.85,0.78],["l",0.85,0.78,0.85,0.935],["r",0.835,0.935,0.03,0.03],["d",0.07,0.365,0.905,0.365]],"active":true},{"id":"builtin:disjoncteur-diff-4p","slug":"disjoncteur-diff-4p","name":"Disjoncteur différentiel 4P","category":"Protection","paths":[["r",0.135,0.035,0.03,0.03],["l",0.15,0.065,0.15,0.18],["l",0.13,0.16,0.17,0.2],["l",0.17,0.16,0.13,0.2],["l",0.075,0.235,0.15,0.43],["l",0.15,0.43,0.15,0.61],["l",0.15,0.61,0.203,0.61],["l",0.203,0.61,0.203,0.685],["l",0.203,0.685,0.15,0.685],["b",0.15,0.685,0.244,0.685,0.244,0.78,0.15,0.78],["l",0.15,0.78,0.15,0.935],["r",0.135,0.935,0.03,0.03],["r",0.368,0.035,0.03,0.03],["l",0.383,0.065,0.383,0.18],["l",0.363,0.16,0.403,0.2],["l",0.403,0.16,0.363,0.2],["l",0.308,0.235,0.383,0.43],["l",0.383,0.43,0.383,0.61],["l",0.383,0.61,0.436,0.61],["l",0.436,0.61,0.436,0.685],["l",0.436,0.685,0.383,0.685],["b",0.383,0.685,0.477,0.685,0.477,0.78,0.383,0.78],["l",0.383,0.78,0.383,0.935],["r",0.368,0.935,0.03,0.03],["r",0.602,0.035,0.03,0.03],["l",0.617,0.065,0.617,0.18],["l",0.597,0.16,0.637,0.2],["l",0.637,0.16,0.597,0.2],["l",0.542,0.235,0.617,0.43],["l",0.617,0.43,0.617,0.61],["l",0.617,0.61,0.67,0.61],["l",0.67,0.61,0.67,0.685],["l",0.67,0.685,0.617,0.685],["b",0.617,0.685,0.711,0.685,0.711,0.78,0.617,0.78],["l",0.617,0.78,0.617,0.935],["r",0.602,0.935,0.03,0.03],["r",0.835,0.035,0.03,0.03],["l",0.85,0.065,0.85,0.18],["l",0.83,0.16,0.87,0.2],["l",0.87,0.16,0.83,0.2],["l",0.775,0.235,0.85,0.43],["l",0.85,0.43,0.85,0.61],["l",0.85,0.61,0.903,0.61],["l",0.903,0.61,0.903,0.685],["l",0.903,0.685,0.85,0.685],["b",0.85,0.685,0.944,0.685,0.944,0.78,0.85,0.78],["l",0.85,0.78,0.85,0.935],["r",0.835,0.935,0.03,0.03],["d",0.07,0.365,0.905,0.365],["d",0.03,0.33,0.97,0.33],["d",0.03,0.33,0.03,0.82],["d",0.03,0.82,0.97,0.82],["d",0.03,0.55,0.97,0.55],["d",0.03,0.73,0.97,0.73],["e",0.5,0.56,0.455,0.052]],"active":true},{"id":"builtin:disjoncteur-moteur-3p","slug":"disjoncteur-moteur-3p","name":"Disjoncteur moteur 3P","category":"Protection","paths":[["r",0.205,0.035,0.03,0.03],["l",0.22,0.065,0.22,0.18],["l",0.2,0.16,0.24,0.2],["l",0.24,0.16,0.2,0.2],["l",0.145,0.235,0.22,0.43],["l",0.22,0.43,0.22,0.61],["l",0.22,0.61,0.273,0.61],["l",0.273,0.61,0.273,0.685],["l",0.273,0.685,0.22,0.685],["b",0.22,0.685,0.314,0.685,0.314,0.78,0.22,0.78],["l",0.22,0.78,0.22,0.935],["r",0.205,0.935,0.03,0.03],["r",0.485,0.035,0.03,0.03],["l",0.5,0.065,0.5,0.18],["l",0.48,0.16,0.52,0.2],["l",0.52,0.16,0.48,0.2],["l",0.425,0.235,0.5,0.43],["l",0.5,0.43,0.5,0.61],["l",0.5,0.61,0.553,0.61],["l",0.553,0.61,0.553,0.685],["l",0.553,0.685,0.5,0.685],["b",0.5,0.685,0.594,0.685,0.594,0.78,0.5,0.78],["l",0.5,0.78,0.5,0.935],["r",0.485,0.935,0.03,0.03],["r",0.765,0.035,0.03,0.03],["l",0.78,0.065,0.78,0.18],["l",0.76,0.16,0.8,0.2],["l",0.8,0.16,0.76,0.2],["l",0.705,0.235,0.78,0.43],["l",0.78,0.43,0.78,0.61],["l",0.78,0.61,0.833,0.61],["l",0.833,0.61,0.833,0.685],["l",0.833,0.685,0.78,0.685],["b",0.78,0.685,0.874,0.685,0.874,0.78,0.78,0.78],["l",0.78,0.78,0.78,0.935],["r",0.765,0.935,0.03,0.03],["d",0.14,0.365,0.835,0.365],["r",0.11,0.62,0.78,0.27],["r",0.14,0.72,0.16,0.12],["l",0.175,0.815,0.21,0.75],["l",0.21,0.75,0.228,0.79],["l",0.228,0.79,0.264,0.73],["r",0.42,0.72,0.16,0.12],["l",0.455,0.815,0.49,0.75],["l",0.49,0.75,0.508,0.79],["l",0.508,0.79,0.544,0.73],["r",0.7,0.72,0.16,0.12],["l",0.735,0.815,0.77,0.75],["l",0.77,0.75,0.788,0.79],["l",0.788,0.79,0.824,0.73],["d",0.11,0.35,0.89,0.35]],"active":true},{"id":"builtin:contact-no","slug":"contact-no","name":"Contact NO (schéma électrique)","category":"Commande","paths":[["r",0.47,0.03,0.06,0.055],["l",0.5,0.085,0.5,0.3],["l",0.5,0.3,0.38,0.68],["l",0.5,0.73,0.5,0.915],["r",0.47,0.915,0.06,0.055],["l",0.47,0.73,0.53,0.73]],"active":true},{"id":"builtin:contact-nf","slug":"contact-nf","name":"Contact NF (schéma électrique)","category":"Commande","paths":[["r",0.47,0.03,0.06,0.055],["l",0.5,0.085,0.5,0.3],["l",0.5,0.3,0.38,0.69],["l",0.38,0.69,0.5,0.73],["l",0.5,0.73,0.5,0.915],["r",0.47,0.915,0.06,0.055],["l",0.36,0.42,0.55,0.42]],"active":true},{"id":"builtin:bobine","slug":"bobine","name":"Bobine relais","category":"Commande","paths":[["l",0.5,0,0.5,0.25],["r",0.2,0.25,0.6,0.5],["l",0.5,0.75,0.5,1]],"active":true},{"id":"builtin:moteur","slug":"moteur","name":"Moteur","category":"Puissance","paths":[["c",0.5,0.5,0.43],["t",0.5,0.56,"M"]],"active":true},{"id":"builtin:transformateur","slug":"transformateur","name":"Transformateur","category":"Puissance","paths":[["c",0.3,0.35,0.2],["c",0.3,0.65,0.2],["l",0.56,0.1,0.56,0.9],["c",0.8,0.35,0.18],["c",0.8,0.65,0.18]],"active":true},{"id":"builtin:voyant","slug":"voyant","name":"Voyant lumineux","category":"Signalisation","paths":[["c",0.5,0.5,0.4],["l",0.25,0.25,0.75,0.75],["l",0.25,0.75,0.75,0.25]],"active":true},{"id":"builtin:terre","slug":"terre","name":"Terre de protection","category":"Repérage","paths":[["l",0.5,0,0.5,0.5],["l",0.1,0.5,0.9,0.5],["l",0.25,0.7,0.75,0.7],["l",0.4,0.9,0.6,0.9]],"active":true},{"id":"builtin:bornier","slug":"bornier","name":"Borne","category":"Repérage","paths":[["l",0,0.5,1,0.5],["c",0.5,0.5,0.28]],"active":true},{"id":"builtin:arret-urgence","slug":"arret-urgence","name":"Arrêt d'urgence","category":"Commande","paths":[["c",0.5,0.5,0.43],["l",0.23,0.23,0.77,0.77],["l",0.77,0.23,0.23,0.77]],"active":true}];
const decode=s=>{try{const a=typeof s==='string'&&s.startsWith(PREFIX)?JSON.parse(s.slice(PREFIX.length)):null;return Array.isArray(a)?a:null}catch{return null}};
function draw(ctx,list,w,h){for(const o of list){ctx.save();ctx.lineJoin=ctx.lineCap='round';if(o.k==='white'){ctx.fillStyle='#fff';ctx.fillRect(Math.min(o.x,o.x2)*w,Math.min(o.y,o.y2)*h,Math.abs(o.x2-o.x)*w,Math.abs(o.y2-o.y)*h)}else if(o.k==='text'){ctx.fillStyle=o.color||'#30343a';ctx.font='bold '+Math.max(7,w*(o.fontSize||.025))+'px sans-serif';ctx.textBaseline='middle';ctx.fillText(o.text||'',o.x*w,o.y*h)}else if(o.k==='symbol'){renderSym(ctx,o,w,h)}else{ctx.strokeStyle=o.color||'#333';ctx.lineWidth=Math.max(1,w*(o.width||.003));ctx.beginPath();if(o.k==='pen'){(o.pts||[]).forEach((p,i)=>i?ctx.lineTo(p[0]*w,p[1]*h):ctx.moveTo(p[0]*w,p[1]*h))}else{ctx.moveTo(o.x*w,o.y*h);ctx.lineTo(o.x2*w,o.y2*h)}ctx.stroke()}ctx.restore()}}

function renderSym(ctx,o,w,h){
const ww=(o.w||.07)*w,hh=(o.h||.09)*h;
ctx.save();ctx.translate(o.x*w,o.y*h);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.strokeStyle=o.color||'#30343a';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(1.5,ww*.032);ctx.lineCap='round';
for(const p of (Array.isArray(o.paths)?o.paths:[])){if(!Array.isArray(p))continue;let [t,a,b,c,d]=p;ctx.beginPath();
if(t==='l'){ctx.moveTo((a-.5)*ww,(b-.5)*hh);ctx.lineTo((c-.5)*ww,(d-.5)*hh);ctx.stroke()}
if(t==='r')ctx.strokeRect((a-.5)*ww,(b-.5)*hh,c*ww,d*hh);
if(t==='c'){ctx.arc((a-.5)*ww,(b-.5)*hh,c*Math.min(ww,hh),0,Math.PI*2);ctx.stroke()}
if(t==='t'){ctx.font='bold '+Math.max(9,ww*.3)+'px sans-serif';ctx.textAlign='center';ctx.fillText(String(c||''),(a-.5)*ww,(b-.5)*hh)}
if(t==='b'){ctx.moveTo((a-.5)*ww,(b-.5)*hh);ctx.bezierCurveTo((c-.5)*ww,(d-.5)*hh,(p[5]-.5)*ww,(p[6]-.5)*hh,(p[7]-.5)*ww,(p[8]-.5)*hh);ctx.stroke()}
if(t==='d'){ctx.save();ctx.setLineDash([Math.max(3,ww*.045),Math.max(3,ww*.034)]);ctx.moveTo((a-.5)*ww,(b-.5)*hh);ctx.lineTo((c-.5)*ww,(d-.5)*hh);ctx.stroke();ctx.restore()}
if(t==='e'){ctx.ellipse((a-.5)*ww,(b-.5)*hh,c*ww,d*hh,0,0,Math.PI*2);ctx.stroke()}

}ctx.restore()}
function canvasPng(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
  if(blob)resolve(blob);
  else reject(Error('Impossible de créer une image des annotations.'));
 },'image/png'));
}

async function appendComments(pdf,notes){
 if(!notes.length)return;
 const canvas=E('canvas'),width=595,height=842,scale=2;
 canvas.width=width*scale;canvas.height=height*scale;
 const ctx=canvas.getContext('2d');
 ctx.scale(scale,scale);
 const margin=42,lineHeight=17,bodyFont='12px sans-serif';
 let y=0;
 function startPage(){
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#30343a';ctx.font='bold 19px sans-serif';
  ctx.fillText('Commentaires partagés',margin,margin);
  ctx.font=bodyFont;y=margin+33;
 }
 async function finishPage(){
  const image=await pdf.embedPng(await (await canvasPng(canvas)).arrayBuffer());
  pdf.addPage([width,height]).drawImage(image,{x:0,y:0,width,height});
 }
 startPage();
 try{
  for(const note of notes){
   const prefix='Page '+note.page;
   const content=note.content.trim();
   for(const paragraph of (prefix+' · '+content).split(/\r?\n/)){
    let line='';
    for(const char of paragraph){
     if(line&&ctx.measureText(line+char).width>width-2*margin){
      if(y>height-margin){await finishPage();startPage()}
      ctx.fillText(line,margin,y);y+=lineHeight;line='';
     }
     line+=char;
    }
    if(y>height-margin){await finishPage();startPage()}
    ctx.fillText(line,margin,y);y+=lineHeight;
   }
   y+=8;
  }
  await finishPage();
 }finally{canvas.width=0;canvas.height=0}
}

async function exportCorrections(bytes,rows,referenceWidth){
 const lib=window.PDFLib;
 if(!lib||!window.pdfjsLib)throw Error('Les outils PDF sont indisponibles.');
 const output=await lib.PDFDocument.load(bytes);
 const pageCount=output.getPageCount(),drawings=new Map(),notes=[];
 for(const row of rows){
  const number=Number(row.page);
  if(!Number.isInteger(number)||number<1||number>pageCount||typeof row.content!=='string')continue;
  if(row.content.startsWith(PREFIX)){
   const content=decode(row.content);
   if(content?.length){
    if(!drawings.has(number))drawings.set(number,[]);
    drawings.get(number).push(content);
   }
  }else if(row.content.trim()){
   notes.push({page:number,content:row.content});
  }
 }
 if(!drawings.size&&!notes.length)throw Error('Aucune correction partagée à exporter.');
 if(drawings.size){
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const task=window.pdfjsLib.getDocument({data:bytes.slice(0)});
  try{
   const input=await task.promise;
   for(const [number,objects] of drawings){
    const source=await input.getPage(number),viewport=source.getViewport({scale:1});
    const w=referenceWidth,h=w*viewport.height/viewport.width;
    const scale=Math.min(3,3600/Math.max(w,h),Math.sqrt(9000000/(w*h)));
    const canvas=E('canvas');
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    try{
     const ctx=canvas.getContext('2d');
     ctx.scale(canvas.width/w,canvas.height/h);
     for(const group of objects)draw(ctx,group,w,h);
     const image=await output.embedPng(await (await canvasPng(canvas)).arrayBuffer());
     // Transform the displayed overlay into the original PDF's coordinates.
     const [x,y]=viewport.convertToPdfPoint(0,viewport.height);
     const [rightX,rightY]=viewport.convertToPdfPoint(viewport.width,viewport.height);
     const [topX,topY]=viewport.convertToPdfPoint(0,0);
     output.getPage(number-1).drawImage(image,{
      x,y,width:Math.hypot(rightX-x,rightY-y),height:Math.hypot(topX-x,topY-y),
      rotate:lib.radians(Math.atan2(rightY-y,rightX-x))
     });
    }finally{canvas.width=0;canvas.height=0}
   }
  }finally{await task.destroy()}
 }
 await appendComments(output,notes.sort((a,b)=>a.page-b.page));
 return output.save();
}

function translateObject(o,dx,dy){o.x=clamp(o.x+dx);o.y=clamp(o.y+dy);if(o.x2!==undefined)o.x2=clamp(o.x2+dx);if(o.y2!==undefined)o.y2=clamp(o.y2+dy);if(o.pts)o.pts=o.pts.map(p=>[clamp(p[0]+dx),clamp(p[1]+dy)])}
function hitSymbol(o,x,y){if(o.k==='symbol')return Math.abs(x-o.x)<(o.w||.07)/2+.02&&Math.abs(y-o.y)<(o.h||.09)/2+.02;
if(o.k==='text')return x>=o.x-.016&&x<=o.x+Math.max(.045,String(o.text||'').length*(o.fontSize||.018)*.6)+.016&&Math.abs(y-o.y)<.03;
return hit(o,x,y)}

function hit(o,x,y){if(o.k==='white')return x>=Math.min(o.x,o.x2)-.025&&x<=Math.max(o.x,o.x2)+.025&&y>=Math.min(o.y,o.y2)-.025&&y<=Math.max(o.y,o.y2)+.025;if(o.k==='text')return Math.abs(o.x-x)<.22&&Math.abs(o.y-y)<.045;if(o.k==='line'){const dx=o.x2-o.x,dy=o.y2-o.y,t=clamp(((x-o.x)*dx+(y-o.y)*dy)/(dx*dx+dy*dy||1));return Math.hypot(x-o.x-t*dx,y-o.y-t*dy)<.025}return(o.pts||[]).some(p=>Math.hypot(x-p[0],y-p[1])<.025)}
async function open({sb,document:doc,user,docUrl,initialPage=1,readOnly=false,onClose,annotationRows,onSubmitCorrections,correctionAuthor='' }){
if(!window.pdfjsLib){alert('Lecteur PDF indisponible.');return}
window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const backdrop=E('div',undefined,'ew-editor-backdrop'),panel=E('div',undefined,'ew-editor-panel'),top=E('header',undefined,'ew-editor-head'),heading=E('div',doc.filename+' · Rév. '+doc.revision,'ew-editor-title'),close=E('button','✕','secondary');
const navigator=E('div',undefined,'ew-editor-pages'),prev=E('button','‹','secondary'),next=E('button','›','secondary'),pageLabel=E('span','Page 1','ew-editor-page-label');
const controls=E('div',undefined,'ew-zoom-controls'),minus=E('button','−','secondary'),zoomLabel=E('span','100 %'),plus=E('button','+','secondary'),fit=E('button','Ajuster','secondary');
const viewport=E('div',undefined,'ew-editor-viewport'),stage=E('div',undefined,'ew-editor-workspace'),pdfCanvas=E('canvas',undefined,'ew-pdf-layer'),ink=E('canvas',undefined,'ew-ink-layer');
const dock=E('div',undefined,'ew-editor-dock'),tools=E('div',undefined,'ew-editor-toolbar'),options=E('div',undefined,'ew-editor-options'),info=E('div','Mode navigation : glisser pour déplacer · pincer pour zoomer','ew-editor-status'),library=E('section',undefined,'ew-symbol-library');library.hidden=true;
const color=E('input'),stroke=E('input'),fontSize=E('input'),fontDisplay=E('output','16 px'),visibility=E('select'),save=E('button','Enregistrer','ew-save'),buttons={};
color.type='color';color.value='#444444';stroke.type='range';stroke.min=1;stroke.max=10;stroke.value=3;fontSize.type='range';fontSize.min='8';fontSize.max='48';fontSize.step='1';fontSize.value='16';
[['shared','Partagée'],['personal','Personnelle']].forEach(([v,t])=>{const o=E('option',t);o.value=v;visibility.append(o)});
const label=(s,control)=>{const e=E('label',s);e.append(control);return e};
const fontLabel=E('label','Texte ');fontLabel.className='ew-font-control';fontLabel.append(fontSize,fontDisplay);
options.append(label('Couleur ',color),label('Épaisseur ',stroke),fontLabel,label('Visibilité ',visibility),save);
const actions=E('div',undefined,'ew-symbol-actions'),editTextBtn=E('button','Modifier texte','secondary'),groupBtn=E('button','Grouper','secondary'),splitBtn=E('button','Dissocier','secondary'),rotateBtn=E('button','↻ 90°','secondary'),growBtn=E('button','+ Taille','secondary'),shrinkBtn=E('button','− Taille','secondary'),deleteBtn=E('button','Supprimer','secondary');
actions.append(editTextBtn,groupBtn,splitBtn,rotateBtn,shrinkBtn,growBtn,deleteBtn);actions.hidden=true;dock.append(actions);
navigator.append(prev,pageLabel,next);controls.append(minus,zoomLabel,plus,fit);top.append(heading,navigator,controls,close);stage.append(pdfCanvas,ink);viewport.append(stage);
panel.append(top);
const compare=E('div',undefined,'ew-editor-compare');compare.hidden=true;
if(readOnly){
 const originalBtn=E('button','Original','secondary'),correctedBtn=E('button','Avec corrections','secondary');
 compare.setAttribute('role','group');compare.setAttribute('aria-label','Affichage du schéma');
 for(const button of [originalBtn,correctedBtn])button.type='button';
 const display=showCorrections=>{
  originalBtn.setAttribute('aria-pressed',String(!showCorrections));
  correctedBtn.setAttribute('aria-pressed',String(showCorrections));
  ink.classList.toggle('ew-ink-original',!showCorrections);
 };
 originalBtn.onclick=()=>display(false);correctedBtn.onclick=()=>display(true);
 compare.append(originalBtn,correctedBtn);panel.append(compare);display(true);
}
panel.append(viewport);if(!readOnly)panel.append(library,dock);panel.append(info);dock.append(tools,options);backdrop.append(panel);document.body.append(backdrop);document.body.classList.add('ew-editing');
let pdf,page=1,mode='navigate',items=[],rows=[],own=null,draft=null,dirty=false,busy=false,baseW=1,baseH=1,zoom=1,tx=0,ty=0,pan=null,gesture=null,lastTap=0,inkScale=1,pdfPage=null,renderTask=null,qualityTimer=null,renderSerial=0,selectedId=null,drag=null,symbolCatalog=[...BUILTIN_SYMBOLS];
const pointers=new Map();
const setStatus=(s,error=false)=>{info.textContent=s;info.style.color=error?'#a52b2b':''};
function selectMode(m){mode=m;if(m!=='select')selectedId=null;refreshSelection();Object.entries(buttons).forEach(([k,b])=>b.classList.toggle('is-active',k===m));options.classList.toggle('is-hidden',m==='navigate');ink.style.cursor=m==='navigate'?'grab':m==='text'?'text':'crosshair';setStatus(m==='navigate'?(correctionAuthor?'Envoyé par '+correctionAuthor:'Navigation : un doigt pour déplacer, deux pour zoomer.'):'Outil actif : '+buttons[m]?.textContent+'. Deux doigts pour naviguer.')}
const choices=[['✋ Déplacer','navigate'],['☝ Sélection','select'],['▦ Symboles','symbols'],['✎ Crayon','pen'],['／ Trait','line'],['▭ Correcteur','white'],['T Texte','text'],['⌫ Gomme','erase'],['↶ Annuler','undo']];
for(const [name,k]of choices){const b=E('button',name);b.type='button';buttons[k]=b;tools.append(b);b.onclick=()=>{if(k==='undo'){if(items.length){items.pop();dirty=true;paint();setStatus('Dernière annotation retirée. Enregistrez.')}return}if(k==='symbols'){selectMode('select');library.hidden=false;library.classList.remove('ew-symbol-detail-open');libForm.replaceChildren();libSearch.hidden=false;libList.hidden=false;library.scrollTop=0;renderCatalog();setStatus('Choisissez un symbole en touchant son dessin.');return}library.hidden=true;selectMode(k)}}
if(onSubmitCorrections&&!readOnly){
const send=E('button','Envoyer au référent','secondary');send.type='button';tools.insertBefore(send,buttons.pen);
send.onclick=async()=>{
if(dirty){setStatus('Enregistre les corrections avant de les envoyer.',true);return}
send.disabled=true;
try{setStatus(await onSubmitCorrections())}catch(e){setStatus(e.message,true)}finally{send.disabled=false}
};
}
const byId=id=>items.find(o=>o.id===id);
const selected=()=>byId(selectedId);
const members=()=>{const o=selected();return !o?[]:(o.grouped&&o.groupId)?items.filter(q=>q.groupId===o.groupId&&q.grouped):[o]};
function refreshSelection(){const o=selected();actions.hidden=mode!=='select'||!o;editTextBtn.disabled=!o||o.k!=='text';if(o?.k==='text'){fontSize.value=String(clamp(Math.round((o.fontSize||.025)*Math.max(1,baseW)),8,48));fontDisplay.textContent=fontSize.value+' px'}groupBtn.disabled=!o||!o.groupId||o.grouped;splitBtn.disabled=!o||!o.groupId||!o.grouped;rotateBtn.disabled=growBtn.disabled=shrinkBtn.disabled=!o||o.k!=='symbol'}
function mutate(msg){dirty=true;paint();refreshSelection();setStatus(msg+' · Enregistrer pour conserver.')}
fontSize.oninput=()=>{const px=Number(fontSize.value);fontDisplay.textContent=px+' px';const o=selected();if(mode==='select'&&o?.k==='text'){o.fontSize=px/Math.max(1,baseW);dirty=true;paint();setStatus('Taille de texte : '+px+' px · Enregistrer pour conserver.')}};
editTextBtn.onclick=()=>{const o=selected();if(o?.k!=='text')return;const text=prompt('Modifier le texte :',o.text||'');if(text!==null){o.text=text.slice(0,250);mutate('Texte modifié')}};
groupBtn.onclick=()=>{const o=selected();if(!o?.groupId)return;items.filter(q=>q.groupId===o.groupId).forEach(q=>q.grouped=true);mutate('Regroupé')};
splitBtn.onclick=()=>{const o=selected();if(!o?.groupId)return;items.filter(q=>q.groupId===o.groupId).forEach(q=>q.grouped=false);mutate('Dissocié')};
rotateBtn.onclick=()=>{const o=selected();if(!o||o.k!=='symbol')return;o.rotation=((o.rotation||0)+90)%360;mutate('Rotation effectuée')};
function scaleSelected(r){const o=selected();if(!o||o.k!=='symbol')return;o.w=clamp((o.w||.07)*r,.02,.4);o.h=clamp((o.h||.09)*r,.02,.4);mutate('Taille modifiée')}
growBtn.onclick=()=>scaleSelected(1.2);shrinkBtn.onclick=()=>scaleSelected(.83);
deleteBtn.onclick=()=>{const ids=new Set(members().map(q=>q.id));items=items.filter(q=>!ids.has(q.id));selectedId=null;mutate('Sélection supprimée')};
const libHead=E('div',undefined,'ew-symbol-head'),libTitle=E('strong','Bibliothèque de symboles'),libClose=E('button','✕','secondary'),libSearch=E('input'),libList=E('div',undefined,'ew-symbol-list'),libForm=E('div',undefined,'ew-symbol-form');
const backToGallery=E('button','‹ Autres symboles','secondary');backToGallery.type='button';backToGallery.className='ew-symbol-back';backToGallery.onclick=()=>{libForm.replaceChildren();library.classList.remove('ew-symbol-detail-open');libSearch.hidden=false;libList.hidden=false;library.scrollTop=0};
libSearch.type='search';libSearch.placeholder='Rechercher…';libHead.append(libTitle,backToGallery,libClose);library.append(libHead,libSearch,libList,libForm);libClose.onclick=()=>{library.hidden=true;libForm.replaceChildren()};
libSearch.oninput=()=>renderCatalog();
function renderCatalog(){
libList.replaceChildren();
const query=libSearch.value.trim().toLocaleLowerCase('fr');
const matches=symbolCatalog.filter(s=>s.active!==false&&[s.name,s.category,s.slug].join(' ').toLocaleLowerCase('fr').includes(query));
const categories=[...new Set(matches.map(s=>s.category))];
for(const category of categories){
const title=E('h3',category,'ew-symbol-category');libList.append(title);
const grid=E('div',undefined,'ew-symbol-grid');
for(const s of matches.filter(s=>s.category===category)){
const b=E('button',undefined,'ew-symbol-choice'),canvasBox=E('div',undefined,'ew-symbol-preview'),canvas=E('canvas'),caption=E('span',s.name,'ew-symbol-caption');
b.type='button';b.setAttribute('aria-label','Insérer '+s.name);
const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));canvas.width=Math.round(92*dpr);canvas.height=Math.round(92*dpr);canvas.style.width='92px';canvas.style.height='92px';
const ctx=canvas.getContext('2d');if(ctx){ctx.scale(dpr,dpr);renderSym(ctx,{x:.5,y:.5,w:.7,h:.7,paths:s.paths,color:'#26333e'},92,92)}
canvasBox.append(canvas);b.append(canvasBox,caption);b.onclick=()=>showSymbolForm(s);grid.append(b);
}
libList.append(grid)
}
if(!matches.length)libList.append(E('p','Aucun symbole correspondant. Essayez une autre recherche.','ew-symbol-empty'));
}
function showSymbolForm(s){libForm.replaceChildren();library.classList.add('ew-symbol-detail-open');libSearch.hidden=true;libList.hidden=true;library.scrollTop=0;
const selectedHeader=E('div',undefined,'ew-symbol-selected');
const selectedPreview=E('canvas');const dpr=Math.min(3,Math.max(1,devicePixelRatio||1));selectedPreview.width=90*dpr;selectedPreview.height=90*dpr;selectedPreview.style.width='90px';selectedPreview.style.height='90px';
const context=selectedPreview.getContext('2d');if(context){context.scale(dpr,dpr);renderSym(context,{x:.5,y:.5,w:.70,h:.70,paths:s.paths},90,90)}
selectedHeader.append(selectedPreview,E('strong',s.name));
libForm.append(selectedHeader);
const form=E('form'),fields={};
for(const [key,caption,example] of [['repere','Repère','10Q1'],['reference','Référence','A9P22602'],['fonction','Caractéristiques','C2A']]){const label=E('label',caption),input=E('input');input.type='text';input.maxLength=90;input.placeholder=example;fields[key]=input;label.append(input);form.append(label)}
const sizeLabel=E('label','Taille des textes (px)'),symbolTextSize=E('input');symbolTextSize.type='number';symbolTextSize.min='8';symbolTextSize.max='48';symbolTextSize.step='1';symbolTextSize.value=fontSize.value;sizeLabel.append(symbolTextSize);form.append(sizeLabel);
const submit=E('button','Insérer sur le PDF');submit.type='submit';form.append(submit);libForm.append(form);library.scrollTop=0;
form.onsubmit=e=>{e.preventDefault();const groupId=crypto.randomUUID(),x=.35,y=.35,w=.072,h=.095;
const group=[{k:'symbol',id:crypto.randomUUID(),groupId,grouped:true,symbolId:s.id,name:s.name,paths:s.paths,x,y,w,h,rotation:0,color:color.value}];
let j=0;for(const key of ['repere','reference','fonction']){const val=fields[key].value.trim();if(val){group.push({k:'text',id:crypto.randomUUID(),groupId,grouped:true,field:key,x:x+w/2+.018,y:y-.025+j*.029,text:val,color:color.value,fontSize:clamp(Number(symbolTextSize.value)||16,8,48)/Math.max(1,baseW)});j++}}
items.push(...group);library.hidden=true;libForm.replaceChildren();selectMode('select');selectedId=group[0].id;mutate(s.name+' inséré : déplacez-le avec le doigt')}
}

selectMode('navigate');
const pageRows=()=>rows.filter(r=>r.page===page&&decode(r.content));
function paint(){const ctx=ink.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ink.width,ink.height);ctx.setTransform(inkScale,0,0,inkScale,0,0);for(const r of pageRows())if(!own||r.id!==own.id)draw(ctx,decode(r.content),baseW,baseH);draw(ctx,items,baseW,baseH);if(mode==='select'&&selected()){const o=selected(),px=o.x*baseW,py=o.y*baseH;ctx.save();ctx.strokeStyle='#557992';ctx.setLineDash([5,4]);ctx.strokeRect(px-(o.k==='symbol'?(o.w||.07)*baseW/2:4)-5,py-(o.k==='symbol'?(o.h||.09)*baseH/2:16)-5,o.k==='symbol'?(o.w||.07)*baseW+10:Math.max(30,String(o.text||'').length*9),o.k==='symbol'?(o.h||.09)*baseH+10:25);ctx.restore()}if(draft)draw(ctx,[draft],baseW,baseH)}
function load(){own=pageRows().find(r=>r.author_id===user.id&&r.visibility===visibility.value)||null;items=own?[...decode(own.content)]:[];dirty=false;selectedId=null;paint();refreshSelection()}
function bound(){const vw=viewport.clientWidth,vh=viewport.clientHeight,ww=baseW*zoom,hh=baseH*zoom;if(ww<=vw)tx=(vw-ww)/2;else tx=clamp(tx,vw-ww-35,35);if(hh<=vh)ty=(vh-hh)/2;else ty=clamp(ty,vh-hh-35,35)}
function transform(){bound();stage.style.transform='translate3d('+tx+'px,'+ty+'px,0) scale('+zoom+')';zoomLabel.textContent=Math.round(zoom*100)+' %'}
function setZoom(z,clientX,clientY){const rect=viewport.getBoundingClientRect(),x=(clientX??(rect.left+rect.width/2))-rect.left,y=(clientY??(rect.top+rect.height/2))-rect.top;const nz=clamp(z,1,6),factor=nz/zoom;tx=x-(x-tx)*factor;ty=y-(y-ty)*factor;zoom=nz;transform();schedulePdfQuality()}
function schedulePdfQuality(){clearTimeout(qualityTimer);qualityTimer=setTimeout(()=>renderPdfAtZoom(),170)}
async function renderPdfAtZoom(){
 if(!pdfPage||!backdrop.isConnected)return;
 const serial=++renderSerial;
 if(renderTask){try{renderTask.cancel()}catch(_){}}
 const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1));
 const maxPixels=16000000;
 const ratio=Math.max(1,Math.min(7,dpr*Math.max(1,zoom),Math.sqrt(maxPixels/Math.max(1,baseW*baseH))));
 const width=Math.max(1,Math.round(baseW*ratio)),height=Math.max(1,Math.round(baseH*ratio));
 if(pdfCanvas.width!==width||pdfCanvas.height!==height){pdfCanvas.width=width;pdfCanvas.height=height}
 const v=pdfPage.getViewport({scale:width/pdfPage.getViewport({scale:1}).width});
 try{
  const task=pdfPage.render({canvasContext:pdfCanvas.getContext('2d'),viewport:v});
  renderTask=task;await task.promise;
  if(serial===renderSerial)renderTask=null;
 }catch(e){if(e?.name!=='RenderingCancelledException'&&serial===renderSerial)setStatus('Affichage PDF : '+(e.message||String(e)),true)}
}
async function renderPage(){busy=true;clearTimeout(qualityTimer);if(renderTask){try{renderTask.cancel()}catch(_){}}try{
 const p=await pdf.getPage(page),view=p.getViewport({scale:1});
 const target=Math.min(1250,Math.max(280,viewport.clientWidth-18)),v=p.getViewport({scale:target/view.width});
 pdfPage=p;baseW=Math.round(v.width);baseH=Math.round(v.height);
 inkScale=Math.min(3,Math.max(1,window.devicePixelRatio||1));
 ink.width=Math.round(baseW*inkScale);ink.height=Math.round(baseH*inkScale);
 stage.style.width=baseW+'px';stage.style.height=baseH+'px';
 pageLabel.textContent=page+' / '+pdf.numPages;
 zoom=1;tx=0;ty=0;transform();load();
 await renderPdfAtZoom();
 }catch(e){setStatus('Erreur PDF : '+e.message,true)}finally{busy=false}}
function norm(p){const b=ink.getBoundingClientRect();return{x:clamp((p.clientX-b.left)/b.width),y:clamp((p.clientY-b.top)/b.height)}}
function middle(){const a=[...pointers.values()];return{x:(a[0].clientX+a[1].clientX)/2,y:(a[0].clientY+a[1].clientY)/2}}
function distance(){const a=[...pointers.values()];return Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY)}
ink.addEventListener('pointerdown',e=>{
if(busy)return;ink.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
if(pointers.size===2){draft=null;pan=null;drag=null;const mid=middle();gesture={distance:distance(),zoom,mid,tx,ty};paint();return}
if(pointers.size>2)return;
const p=norm(e);
if(mode==='navigate'){pan={x:e.clientX,y:e.clientY,tx,ty};return}if(mode==='select'){const o=[...items].reverse().find(q=>hitSymbol(q,p.x,p.y));selectedId=o?.id||null;drag=o?{x:p.x,y:p.y,list:members()}:null;refreshSelection();paint();return}
if(mode==='erase'){const i=items.findLastIndex(o=>hit(o,p.x,p.y));if(i>=0){items.splice(i,1);dirty=true;paint();setStatus('Annotation effacée. Enregistrer.')}else setStatus('La gomme efface vos annotations ; pour masquer le PDF, utilisez Correcteur.');return}
if(mode==='text'){const t=prompt('Texte à placer sur le schéma :');if(t?.trim()){items.push({k:'text',id:crypto.randomUUID(),x:p.x,y:p.y,text:t.slice(0,250),color:color.value,fontSize:Number(fontSize.value)/Math.max(1,baseW)});dirty=true;paint()}return}
draft={k:mode,x:p.x,y:p.y,x2:p.x,y2:p.y,pts:[[p.x,p.y]],color:color.value,width:Number(stroke.value)/1000};paint()
});
ink.addEventListener('pointermove',e=>{
if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
if(pointers.size>=2){if(!gesture)return;const mid=middle(),factor=distance()/Math.max(1,gesture.distance);const target=clamp(gesture.zoom*factor,1,6);const rect=viewport.getBoundingClientRect(),cx=gesture.mid.x-rect.left,cy=gesture.mid.y-rect.top,nx=mid.x-rect.left,ny=mid.y-rect.top;zoom=target;tx=nx-(cx-gesture.tx)*(target/gesture.zoom);ty=ny-(cy-gesture.ty)*(target/gesture.zoom);transform();return}
if(pan){tx=pan.tx+e.clientX-pan.x;ty=pan.ty+e.clientY-pan.y;transform();return}if(drag){const p=norm(e),dx=p.x-drag.x,dy=p.y-drag.y;drag.list.forEach(o=>translateObject(o,dx,dy));drag.x=p.x;drag.y=p.y;dirty=true;paint();return}
if(!draft)return;const p=norm(e);draft.x2=p.x;draft.y2=p.y;if(draft.k==='pen')draft.pts.push([p.x,p.y]);paint()
});
function finish(e){const wasPinching=!!gesture;pointers.delete(e.pointerId);if(wasPinching){draft=null;pan=null;drag=null;if(pointers.size<2){gesture=null;schedulePdfQuality()}paint();return}if(pan){pan=null;return}if(drag){drag=null;return}if(draft){const isTiny=draft.k!=='pen'&&Math.hypot(draft.x-draft.x2,draft.y-draft.y2)<.001;if(!isTiny){items.push(draft);dirty=true;setStatus('Modification non enregistrée.')}draft=null;paint()}}
ink.addEventListener('pointerup',finish);ink.addEventListener('pointercancel',finish);
ink.addEventListener('dblclick',e=>{if(mode==='navigate')setZoom(zoom<2?zoom*2:1,e.clientX,e.clientY);else if(mode==='select'){const o=selected();if(o?.k==='text'){const t=prompt('Modifier '+(o.field||'le texte')+' :',o.text||'');if(t!==null){o.text=t.slice(0,250);mutate('Texte modifié')}}}});
viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&Math.abs(e.deltaY)<5)return;e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX,e.clientY)},{passive:false});
minus.onclick=()=>setZoom(zoom/1.4);plus.onclick=()=>setZoom(zoom*1.4);fit.onclick=()=>{zoom=1;tx=ty=0;transform();schedulePdfQuality()};window.addEventListener('resize',transform,{signal:(()=>{const ctl=new AbortController();backdrop._resizeCtl=ctl;return ctl.signal})()});
save.onclick=async()=>{if(!dirty){setStatus('Aucune modification à enregistrer.');return}save.disabled=true;try{const content=PREFIX+JSON.stringify(items);let r;if(own)r=await sb.from('annotations').update({content}).eq('id',own.id).eq('author_id',user.id).select().single();else r=await sb.from('annotations').insert({document_id:doc.id,author_id:user.id,page,visibility:visibility.value,content}).select().single();if(r.error)throw r.error;const q=await sb.from('annotations').select('*').eq('document_id',doc.id);if(q.error)throw q.error;rows=q.data||[];load();setStatus('Enregistré. Le PDF officiel reste inchangé.')}catch(e){setStatus('Enregistrement impossible : '+e.message,true)}finally{save.disabled=false}};
const changePage=async n=>{if(dirty&&!confirm('Modifications non enregistrées. Changer de page ?'))return;if(page+n<1||page+n>pdf.numPages)return;page+=n;await renderPage();selectMode('navigate')};prev.onclick=()=>changePage(-1);next.onclick=()=>changePage(1);
visibility.onchange=()=>{if(dirty&&!confirm('Abandonner les modifications non enregistrées ?')){visibility.value=visibility.value==='shared'?'personal':'shared';return}load()};
function end(){if(dirty&&!confirm('Fermer sans enregistrer ?'))return;clearTimeout(qualityTimer);if(renderTask){try{renderTask.cancel()}catch(_){}}backdrop._resizeCtl?.abort();backdrop.remove();document.body.classList.remove('ew-editing');onClose?.()}
close.onclick=end;
try{setStatus('Chargement du schéma…');pdf=await window.pdfjsLib.getDocument(await docUrl(doc)).promise;if(annotationRows){rows=annotationRows}else{const r=await sb.from('annotations').select('*').eq('document_id',doc.id);if(r.error)throw r.error;rows=r.data||[]}page=clamp(Math.trunc(Number(initialPage))||1,1,pdf.numPages);if(readOnly){compare.hidden=!rows.some(r=>decode(r.content)?.length);await renderPage();selectMode('navigate');return}const catalog=await sb.from('electrical_symbols').select('id,slug,name,category,paths,active').eq('active',true).order('category').order('name');if(catalog.error){symbolCatalog=[...BUILTIN_SYMBOLS];setStatus('Symboles intégrés disponibles (connexion bibliothèque momentanément indisponible).')}
else{const fromDb=catalog.data||[];symbolCatalog=[...fromDb.filter(x=>Array.isArray(x.paths)&&x.paths.length),...BUILTIN_SYMBOLS.filter(x=>!fromDb.some(y=>y.slug===x.slug))];}
renderCatalog();await renderPage();selectMode('navigate')}catch(e){setStatus('Erreur de chargement : '+e.message,true)}
}
window.EW_PDF_EDITOR={open,exportCorrections};
})();
