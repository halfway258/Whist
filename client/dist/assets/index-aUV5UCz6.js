(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=null,t=new Set;function n(n){e=n;for(let n of t)try{n(e)}catch(e){console.error(`[State] Listener error:`,e)}}function r(){return e}function i(e){return t.add(e),()=>t.delete(e)}var a=[`LOBBY`,`DEALING`,`BETTING`,`PLAYING`,`ROUND_END`,`GAME_OVER`],o=new Set([`DEALING`,`BETTING`,`PLAYING`,`ROUND_END`]),s={},c=null,l=null,u=new Map;function d(){s.LOBBY=document.getElementById(`stage-lobby`),s.DEALING=document.getElementById(`stage-dealing`),s.BETTING=document.getElementById(`stage-betting`),s.PLAYING=document.getElementById(`stage-playing`),s.ROUND_END=document.getElementById(`stage-round-end`),s.GAME_OVER=document.getElementById(`stage-game-over`),c=document.getElementById(`hud`)}function f(e,t){u.set(e,t)}function p(e){if(!e||!e.current_stage)return;let t=e.current_stage;for(let[e,n]of Object.entries(s))e===t?n.classList.add(`active`):n.classList.remove(`active`);c&&(c.style.display=o.has(t)?``:`none`);let n=u.get(t),r=s[t];n&&r&&n(e,r);let i=document.getElementById(`dev-stage-label`);i&&(i.textContent=t),l=t}function m(){return a}function h(){return l}var g=null,_=null,v=1e3,y=1e4,b=`disconnected`,x=new Set,S=null;function C(e){S=e}function w(e=`ws://127.0.0.1:8080`){g&&(g.readyState===WebSocket.OPEN||g.readyState===WebSocket.CONNECTING)&&g.close(),D(`connecting`),console.log(`[Network] Connecting to ${e}...`);try{g=new WebSocket(e)}catch(t){console.error(`[Network] WebSocket creation failed:`,t),O(e);return}g.addEventListener(`open`,()=>{console.log(`[Network] Connected`),v=1e3,D(`connected`)}),g.addEventListener(`message`,e=>{try{let t=JSON.parse(e.data);S&&S(t)}catch(e){console.error(`[Network] Failed to parse message:`,e)}}),g.addEventListener(`close`,t=>{console.log(`[Network] Disconnected (code: ${t.code})`),D(`disconnected`),O(e)}),g.addEventListener(`error`,e=>{console.error(`[Network] Error:`,e)})}function T(e){if(!g||g.readyState!==WebSocket.OPEN){console.warn(`[Network] Cannot send — not connected`);return}g.send(JSON.stringify(e))}function E(){return b}function D(e){b=e;for(let e of x)e(b)}function O(e){clearTimeout(_),console.log(`[Network] Reconnecting in ${v}ms...`),_=setTimeout(()=>{v=Math.min(v*2,y),w(e)},v)}var k=[`hearts`,`diamonds`,`clubs`,`spades`];function A(){return{suit:k[Math.floor(Math.random()*4)],value:Math.floor(Math.random()*13)+2}}function j(e){let t=[];for(let n=0;n<e;n++)t.push(A());return t}var M={LOBBY:{current_stage:`LOBBY`,game_stats:{round:0,target_score:100},players:[{id:`p1`,name:`You`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``}],my_hand:[],table_cards:[],prompt_data:null,trick_winner:null,winner:null},DEALING:{current_stage:`DEALING`,game_stats:{round:1,target_score:100},players:[{id:`p1`,name:`You`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p2`,name:`Alice`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p3`,name:`Bob`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p4`,name:`Carol`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``}],my_hand:j(13),table_cards:[],prompt_data:null,trick_winner:null,winner:null},BETTING:{current_stage:`BETTING`,game_stats:{round:1,target_score:100},players:[{id:`p1`,name:`You`,score:0,tricks_taken:0,is_turn:!0,cards_played:[],bet:null,status:``},{id:`p2`,name:`Alice`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:3,status:`Bet 3`},{id:`p3`,name:`Bob`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:`Thinking...`},{id:`p4`,name:`Carol`,score:0,tricks_taken:0,is_turn:!1,cards_played:[],bet:5,status:`Bet 5`}],my_hand:[{suit:`spades`,value:14},{suit:`spades`,value:13},{suit:`hearts`,value:12},{suit:`hearts`,value:10},{suit:`hearts`,value:7},{suit:`diamonds`,value:14},{suit:`diamonds`,value:9},{suit:`diamonds`,value:5},{suit:`clubs`,value:11},{suit:`clubs`,value:8},{suit:`clubs`,value:6},{suit:`clubs`,value:3},{suit:`spades`,value:4}],table_cards:[],prompt_data:{min_bet:0,max_bet:13},trick_winner:null,winner:null},PLAYING:{current_stage:`PLAYING`,game_stats:{round:1,target_score:100},players:[{id:`p1`,name:`You`,score:12,tricks_taken:2,is_turn:!0,cards_played:[],bet:4,status:``},{id:`p2`,name:`Alice`,score:8,tricks_taken:1,is_turn:!1,cards_played:[],bet:3,status:``},{id:`p3`,name:`Bob`,score:15,tricks_taken:2,is_turn:!1,cards_played:[],bet:2,status:``},{id:`p4`,name:`Carol`,score:10,tricks_taken:3,is_turn:!1,cards_played:[],bet:5,status:``}],my_hand:[{suit:`spades`,value:14},{suit:`hearts`,value:12},{suit:`hearts`,value:7},{suit:`diamonds`,value:14},{suit:`diamonds`,value:9},{suit:`clubs`,value:11},{suit:`clubs`,value:8},{suit:`clubs`,value:3}],table_cards:[{player_id:`p2`,card:{suit:`clubs`,value:12}},{player_id:`p3`,card:{suit:`clubs`,value:5}},{player_id:`p4`,card:{suit:`clubs`,value:14}}],prompt_data:null,trick_winner:null,winner:null},ROUND_END:{current_stage:`ROUND_END`,game_stats:{round:1,target_score:100},players:[{id:`p1`,name:`You`,score:38,tricks_taken:4,is_turn:!1,cards_played:[],bet:4,status:``,score_change:26},{id:`p2`,name:`Alice`,score:27,tricks_taken:3,is_turn:!1,cards_played:[],bet:3,status:``,score_change:19},{id:`p3`,name:`Bob`,score:5,tricks_taken:1,is_turn:!1,cards_played:[],bet:2,status:``,score_change:-10},{id:`p4`,name:`Carol`,score:45,tricks_taken:5,is_turn:!1,cards_played:[],bet:5,status:``,score_change:35}],my_hand:[],table_cards:[],prompt_data:null,trick_winner:null,winner:null},GAME_OVER:{current_stage:`GAME_OVER`,game_stats:{round:8,target_score:100},players:[{id:`p1`,name:`You`,score:102,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p2`,name:`Alice`,score:87,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p3`,name:`Bob`,score:64,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p4`,name:`Carol`,score:111,tricks_taken:0,is_turn:!1,cards_played:[],bet:null,status:``}],my_hand:[],table_cards:[],prompt_data:null,trick_winner:null,winner:{id:`p4`,name:`Carol`}}};function N(e){return structuredClone(M[e]||M.LOBBY)}var P=[{id:`room-1`,name:`Tel Aviv Open Championship`,players:3,maxPlayers:4,hasPassword:!0},{id:`room-2`,name:`Casual Friday Whist`,players:1,maxPlayers:4,hasPassword:!1},{id:`room-3`,name:`Elite Masters Room`,players:4,maxPlayers:4,hasPassword:!0},{id:`room-4`,name:`Beginners Welcome Room`,players:2,maxPlayers:4,hasPassword:!1}];function F(e,t){t.innerHTML=``;let n=e.players||[];n.length<=1?e.view_stage===`ROOM_LIST`?L(t):I(t):z(n,t,e)}function I(e){let t=document.createElement(`div`);t.className=`glass p-8 md:p-10 max-w-md w-full mx-4 flex flex-col items-center text-center shadow-2xl relative overflow-hidden`,t.innerHTML=`
    <!-- Floating decorative suit symbols -->
    <div class="absolute -top-10 -left-10 text-9xl text-slate-700/5 select-none font-bold">♠</div>
    <div class="absolute -bottom-10 -right-10 text-9xl text-slate-700/5 select-none font-bold">♥</div>
    <div class="absolute top-1/2 right-4 text-6xl text-slate-700/5 select-none font-bold">♦</div>
    <div class="absolute top-1/3 left-4 text-6xl text-slate-700/5 select-none font-bold">♣</div>

    <div class="relative z-10 w-full flex flex-col items-center">
      <h1 class="text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 mb-2">WHIST</h1>
      <div class="text-[10px] uppercase font-black tracking-widest text-emerald-400/80 mb-6 bg-emerald-950/40 px-2 py-0.5 rounded">Israeli Edition</div>
      <p class="text-slate-400 text-sm mb-8">A classic trick-taking card game. Choose a connection option to start.</p>

      <div class="flex flex-col gap-4 w-full" id="menu-buttons">
        <button id="btn-offline" class="btn btn-primary text-base py-3.5 flex justify-center items-center gap-2">
          <span>⚡</span> Play Offline vs Bots
        </button>
        <button id="btn-show-online" class="btn btn-secondary text-base py-3.5 flex justify-center items-center gap-2">
          <span>🌐</span> Online Multiplayer
        </button>
      </div>
    </div>
  `,e.appendChild(t);let i=t.querySelector(`#btn-offline`),a=t.querySelector(`#btn-show-online`);i.addEventListener(`click`,()=>{i.disabled=!0,i.textContent=`Connecting...`,w(`ws://127.0.0.1:8080?mode=offline`)}),a.addEventListener(`click`,()=>{a.disabled=!0,a.textContent=`Connecting...`,w(`ws://127.0.0.1:8080?mode=online`),setTimeout(()=>{let e=r()||{};e.view_stage=`ROOM_LIST`,n(e)},500)})}function L(e){let t=document.createElement(`div`);t.className=`glass p-8 max-w-2xl w-full mx-4 flex flex-col shadow-2xl relative z-10 max-h-[90vh] overflow-hidden`,t.innerHTML=`
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
      <div>
        <h2 class="text-2xl font-black text-white tracking-wide">Room Browser</h2>
        <p class="text-slate-400 text-xs mt-0.5">Select a room to play or spectate games</p>
      </div>
      <button id="btn-create-room" class="btn btn-primary text-xs !py-2 !px-3 flex items-center gap-1.5">
        <span>+</span> Create Room
      </button>
    </div>

    <!-- Rooms list -->
    <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[250px] max-h-[350px] mb-6" id="rooms-list-container">
      ${P.map(e=>{let t=e.players>=e.maxPlayers,n=t?`bg-amber-500/10 text-amber-400 border-amber-500/20`:`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;return`
          <div class="glass-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800 hover:border-slate-700 transition-colors">
            <div class="flex flex-col gap-1 text-left">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">${e.name}</span>
                ${e.hasPassword?`<span class="text-slate-400 text-[10px]">🔒 Private</span>`:`<span class="text-emerald-500/80 text-[10px]">🔓 Open</span>`}
              </div>
              <div class="flex gap-2 items-center">
                <span class="text-[10px] px-1.5 py-0.5 rounded border font-semibold ${n}">${e.players}/${e.maxPlayers} Players</span>
                <span class="text-[10px] text-slate-500 font-mono">ID: ${e.id}</span>
              </div>
            </div>
            
            <div class="flex gap-2 self-end md:self-auto">
              <button class="btn btn-secondary text-xs !py-1.5 !px-3 btn-spectate" data-id="${e.id}" data-private="${e.hasPassword}">
                👁️ Spectate
              </button>
              ${t?`
                <button class="btn btn-secondary text-xs !py-1.5 !px-4 opacity-50 cursor-not-allowed" disabled>
                  Room Full
                </button>
              `:`
                <button class="btn btn-primary text-xs !py-1.5 !px-4 btn-join" data-id="${e.id}" data-private="${e.hasPassword}">
                  ⚔️ Join Game
                </button>
              `}
            </div>
          </div>
        `}).join(``)}
    </div>

    <!-- Back to main menu -->
    <div class="flex justify-between items-center">
      <button id="btn-browser-back" class="btn btn-secondary text-xs !py-2 !px-4">
        ← Main Menu
      </button>
      <span class="text-[10px] text-slate-500 font-medium">Israeli Whist Room Broker active</span>
    </div>

    <!-- Sleek Password Modal (Hidden by Default) -->
    <div id="password-modal" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center hidden z-30">
      <div class="glass p-6 max-w-sm w-full mx-4 border border-slate-800 flex flex-col items-center text-center">
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Enter Room Token</h3>
        <p class="text-xs text-slate-400 mb-6">This room requires a password or private access key.</p>
        
        <input type="password" id="room-password-input" class="input w-full text-center mb-6 font-mono text-lg tracking-widest" placeholder="••••••••" />
        
        <div class="flex gap-2 w-full">
          <button id="btn-modal-cancel" class="btn btn-secondary flex-1 py-2 text-xs">Cancel</button>
          <button id="btn-modal-submit" class="btn btn-primary flex-1 py-2 text-xs">Submit</button>
        </div>
      </div>
    </div>
  `,e.appendChild(t);let i=t.querySelector(`#btn-browser-back`),a=t.querySelector(`#btn-create-room`),o=t.querySelector(`#password-modal`),s=t.querySelector(`#btn-modal-cancel`),c=t.querySelector(`#btn-modal-submit`),l=t.querySelector(`#room-password-input`),u=null,d=`player`;i.addEventListener(`click`,()=>{let e=r()||{};e.view_stage=`SERVER_SELECT`,n(e)}),a.addEventListener(`click`,()=>{let t=prompt(`Enter Room Name:`,`New Whist Lounge`);if(!t)return;let n=prompt(`Enter optional Password / Token (leave blank for open):`);T({action:`create_room`,name:t,password:n||null});let r=`room-${P.length+1}`;P.push({id:r,name:t,players:1,maxPlayers:4,hasPassword:!!n}),L(e)}),t.querySelectorAll(`.btn-join`).forEach(e=>{e.addEventListener(`click`,()=>{u=e.dataset.id,d=`player`,e.dataset.private===`true`?(l.value=``,o.classList.remove(`hidden`),l.focus()):R(u,``,d)})}),t.querySelectorAll(`.btn-spectate`).forEach(e=>{e.addEventListener(`click`,()=>{u=e.dataset.id,d=`spectator`,e.dataset.private===`true`?(l.value=``,o.classList.remove(`hidden`),l.focus()):R(u,``,d)})}),s.addEventListener(`click`,()=>{o.classList.add(`hidden`)}),c.addEventListener(`click`,()=>{let e=l.value.trim();e&&(o.classList.add(`hidden`),R(u,e,d))}),l.addEventListener(`keydown`,e=>{e.key===`Enter`&&c.click()})}function R(e,t,i){T({action:`join_room`,room_id:e,password:t||null,role:i}),console.log(`[Lobby] Joining room ${e} as ${i}...`),setTimeout(()=>{let e=r()||{};e.is_spectator=i===`spectator`,e.players=[{id:`p1`,name:`You`,score:0,is_turn:!1,cards_played:[],bet:null,status:``},{id:`p2`,name:`Alice`,score:0,is_turn:!1,cards_played:[],bet:null,status:``}],n(e)},800)}function z(e,t,i){let a=document.createElement(`div`);a.className=`glass p-8 max-w-lg w-full mx-4 flex flex-col items-center text-center shadow-2xl relative`;let o=e.length,s=i.is_spectator===!0;a.innerHTML=`
    <h2 class="text-2xl font-black text-white mb-1 tracking-wide">Waiting Room</h2>
    <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 pulse-soft">
      ${s?`Spectating Mode — Waiting for game launch`:`Waiting for players to join...`}
    </div>
    
    ${s?`<div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50 border border-slate-800 px-3 py-1 rounded mb-8">Viewer</div>`:`<div class="mb-8"></div>`}

    <!-- Players grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
      ${[0,1,2,3].map(t=>{let n=e[t];return n?`
            <div class="glass-sm px-3 py-5 flex flex-col items-center border border-emerald-500/25 bg-emerald-950/10">
              <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
                ${n.name.charAt(0).toUpperCase()}
              </div>
              <span class="text-sm font-bold text-white truncate max-w-full">${n.name}</span>
              <span class="text-[10px] text-emerald-400 font-medium uppercase mt-1">Ready</span>
            </div>
          `:`
            <div class="glass-sm px-3 py-5 flex flex-col items-center opacity-40 border border-slate-700/30 border-dashed animate-pulse">
              <div class="w-10 h-10 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center font-bold text-lg mb-3">
                ?
              </div>
              <span class="text-sm font-semibold text-slate-500">Waiting</span>
              <span class="text-[10px] text-slate-600 font-medium uppercase mt-1">-</span>
            </div>
          `}).join(``)}
    </div>

    <div class="flex items-center justify-center gap-6 text-slate-400 text-sm font-medium">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
        <span>${o}/4 Players Connected</span>
      </div>
      
      <!-- Back / Exit Room Button -->
      <button id="btn-exit-room" class="btn btn-secondary text-xs !py-1.5 !px-3">
        Exit Room
      </button>
    </div>
  `,t.appendChild(a);let c=a.querySelector(`#btn-exit-room`);c.addEventListener(`click`,()=>{c.disabled=!0,T({action:`leave_room`});let e=r()||{};e.players=[],e.is_spectator=!1,e.view_stage=`ROOM_LIST`,n(e)})}var B={hearts:`♥`,diamonds:`♦`,clubs:`♣`,spades:`♠`},V={hearts:`#ef4444`,diamonds:`#ef4444`,clubs:`#1e293b`,spades:`#1e293b`},H={2:`2`,3:`3`,4:`4`,5:`5`,6:`6`,7:`7`,8:`8`,9:`9`,10:`10`,11:`J`,12:`Q`,13:`K`,14:`A`};function U(e,t={}){let{suit:n,value:r}=e,i=B[n]||`?`,a=V[n]||`#1e293b`,o=H[r]||r,s=t.mini?28:t.small?68:90,c=t.mini?40:t.small?96:128,l=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);return l.setAttribute(`viewBox`,`0 0 70 100`),l.setAttribute(`width`,s),l.setAttribute(`height`,c),l.classList.add(`game-card`),l.innerHTML=`
    <!-- Card body -->
    <rect x="0.5" y="0.5" width="69" height="99" rx="8" ry="8"
          fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>

    <!-- Top-left value + suit -->
    <text x="5" y="21" font-family="Inter, sans-serif" font-size="20" font-weight="900" fill="${a}">${o}</text>
    <text x="5" y="36" font-family="Inter, sans-serif" font-size="15" fill="${a}">${i}</text>

    <!-- Center suit (large) -->
    <text x="35" y="60" font-family="Inter, sans-serif" font-size="30" fill="${a}"
          text-anchor="middle" dominant-baseline="middle">${i}</text>

    <!-- Bottom-right value + suit (rotated) -->
    <g transform="rotate(180, 35, 50)">
      <text x="5" y="21" font-family="Inter, sans-serif" font-size="20" font-weight="900" fill="${a}">${o}</text>
      <text x="5" y="36" font-family="Inter, sans-serif" font-size="15" fill="${a}">${i}</text>
    </g>
  `,l.dataset.suit=n,l.dataset.value=r,l}function W(e={}){let t=e.mini?28:e.small?68:90,n=e.mini?40:e.small?96:128,r=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);return r.setAttribute(`viewBox`,`0 0 70 100`),r.setAttribute(`width`,t),r.setAttribute(`height`,n),r.classList.add(`game-card`),r.innerHTML=`
    <!-- Card body -->
    <rect x="0.5" y="0.5" width="69" height="99" rx="8" ry="8"
          fill="#1e3a5f" stroke="#334155" stroke-width="1"/>

    <!-- Pattern border -->
    <rect x="5" y="5" width="60" height="90" rx="5" ry="5"
          fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.4"/>

    <!-- Diamond pattern -->
    <g opacity="0.25" fill="#60a5fa">
      <polygon points="35,15 42,30 35,45 28,30"/>
      <polygon points="35,35 42,50 35,65 28,50"/>
      <polygon points="35,55 42,70 35,85 28,70"/>
      <polygon points="20,25 27,40 20,55 13,40"/>
      <polygon points="50,25 57,40 50,55 43,40"/>
      <polygon points="20,45 27,60 20,75 13,60"/>
      <polygon points="50,45 57,60 50,75 43,60"/>
    </g>

    <!-- Center emblem -->
    <circle cx="35" cy="50" r="10" fill="none" stroke="#60a5fa" stroke-width="1.5" opacity="0.5"/>
    <text x="35" y="54" font-family="Inter, sans-serif" font-size="10" font-weight="700"
          fill="#93c5fd" text-anchor="middle" opacity="0.6">W</text>
  `,r}function G(e,t){t.innerHTML=``;let n=e.players||[],r=document.createElement(`div`);r.className=`table-felt w-full max-w-4xl h-[420px] rounded-[40px] relative overflow-hidden flex items-center justify-center`,r.innerHTML=`
    <div class="absolute inset-10 border border-emerald-800/20 rounded-[30px] pointer-events-none"></div>
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="text-[10px] uppercase font-black tracking-widest text-emerald-950 select-none">WHIST DEALING</div>
    </div>
  `;let i=document.createElement(`div`);i.className=`absolute z-20 flex items-center justify-center`;for(let e=0;e<5;e++){let t=W();t.style.position=`absolute`,t.style.transform=`translate(${-e*.5}px, ${-e*.5}px)`,t.style.boxShadow=`${e}px ${e}px 4px rgba(0,0,0,0.15)`,i.appendChild(t)}r.appendChild(i);let a=[{x:`0px`,y:`140px`,rot:`0deg`},{x:`-220px`,y:`0px`,rot:`90deg`},{x:`0px`,y:`-140px`,rot:`0deg`},{x:`220px`,y:`0px`,rot:`-90deg`}],o=0;for(let e=0;e<13;e++)for(let e=0;e<4;e++){if(!n[e])continue;let t=a[e],i=W({small:!0});i.style.position=`absolute`,i.style.setProperty(`--deal-x`,t.x),i.style.setProperty(`--deal-y`,t.y),i.style.setProperty(`--deal-rot`,t.rot),i.style.setProperty(`--deal-delay`,`${o*.05}s`),i.classList.add(`deal-animate`),r.appendChild(i),o++}let s=[`bottom-2 left-1/2 -translate-x-1/2`,`left-2 top-1/2 -translate-y-1/2`,`top-2 left-1/2 -translate-x-1/2`,`right-2 top-1/2 -translate-y-1/2`];for(let e=0;e<4;e++){let t=n[e];if(!t)continue;let i=document.createElement(`div`);i.className=`absolute ${s[e]} glass-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 z-10`,i.textContent=e===0?`You`:t.name,r.appendChild(i)}t.appendChild(r)}function K(e,t){t.innerHTML=``;let n=(e.players||[])[0]||{name:`You`,is_turn:!1},r=e.prompt_data||{bidding_stage:`SUIT`,min_bet:5,max_bet:13},i=e.my_hand||[],a=(r.bidding_stage||`SUIT`).toUpperCase(),o=a===`EXCHANGE`,s=document.createElement(`div`);s.className=`w-full h-full flex flex-col justify-between items-center p-4 relative`;let c=document.createElement(`div`);c.className=`table-felt w-full max-w-4xl flex-1 rounded-[40px] relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] my-4`;let l=document.createElement(`div`);l.className=`text-center z-0`,n.is_turn?o?l.innerHTML=`
        <div class="text-xs uppercase font-extrabold tracking-widest text-amber-400 mb-2 pulse-soft">Card Exchange Phase</div>
        <div class="text-sm font-semibold text-slate-400">Select exactly 2 cards from your hand to pass clockwise.</div>
      `:r.bidding_stage===`TAKES`?l.innerHTML=`
        <div class="text-xs uppercase font-extrabold tracking-widest text-emerald-500/60 mb-2">Bid Your Expected Tricks</div>
        <div class="text-sm font-semibold text-slate-400">The total sum of all player bids cannot be exactly 13.</div>
      `:l.innerHTML=`
        <div class="text-xs uppercase font-extrabold tracking-widest text-emerald-500/60 mb-2">Declare Contract Suit</div>
        <div class="text-sm font-semibold text-slate-400">Bid at least 5 takes to set the contract, or select Skip.</div>
      `:l.innerHTML=`
      <div class="text-xs uppercase font-extrabold tracking-widest text-amber-500/60 mb-2">Waiting For Players</div>
      <div class="text-sm font-semibold text-slate-400 flex items-center justify-center gap-1">
        <span>Opponents are making their choices</span>
        <span class="inline-flex">
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
        </span>
      </div>
    `,c.appendChild(l),s.appendChild(c);let u=[];if(n.is_turn){let e=document.createElement(`div`);if(e.className=`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 glass p-6 max-w-md w-full shadow-2xl flex flex-col items-center border border-emerald-500/20`,o){e.innerHTML=`
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Exchange Cards</h3>
        <p class="text-slate-400 text-[11px] font-medium mb-6">Choose 2 cards to pass to the next player</p>
        <div class="w-full flex flex-col items-center gap-4">
          <div class="text-slate-400 text-xs font-semibold" id="exchange-count">0 of 2 Selected</div>
          <button id="btn-confirm-exchange" class="btn btn-primary w-full py-3" disabled>Confirm Exchange</button>
        </div>
      `;let t=e.querySelector(`#btn-confirm-exchange`);t.addEventListener(`click`,()=>{u.length===2&&(t.disabled=!0,e.querySelector(`h3`).textContent=`Submitting...`,T({action:`exchange_cards`,cards:u}))}),s.appendChild(e)}else if(a===`SUIT`){e.innerHTML=`
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Select Trump & Bid</h3>
        <p class="text-slate-400 text-[11px] font-medium mb-4">Choose a suit and bid at least ${r.min_bet} takes</p>
        
        <div class="w-full flex flex-col gap-4">
          <!-- Suit buttons -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trump Suit</label>
            <div class="grid grid-cols-5 gap-1.5 w-full" id="suit-buttons-container">
              <button data-suit="no_trump" class="btn btn-gold py-2 px-1 text-xs font-bold border border-slate-700/50">NT</button>
              <button data-suit="spades" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50">♠</button>
              <button data-suit="hearts" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50 text-rose-500">♥</button>
              <button data-suit="diamonds" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50 text-amber-500">♦</button>
              <button data-suit="clubs" class="btn btn-secondary py-2 px-1 text-xs font-bold border border-slate-700/50 text-emerald-400">♣</button>
            </div>
          </div>

          <!-- Takes select slider -->
          <div class="flex flex-col items-center gap-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider self-start">Minimum Bid: ${r.min_bet}</label>
            <div class="text-3xl font-black text-amber-400 font-mono" id="slider-val">${r.min_bet}</div>
            <input type="range" min="${r.min_bet}" max="13" value="${r.min_bet}" class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" id="bet-slider" />
          </div>

          <!-- Actions -->
          <div class="flex gap-3 mt-2">
            <button id="btn-skip-bid" class="btn btn-secondary flex-1 py-3">Skip</button>
            <button id="btn-confirm-bid" class="btn btn-primary flex-1 py-3">Bid</button>
          </div>
        </div>
      `;let t=`no_trump`,n=e.querySelector(`#suit-buttons-container`).querySelectorAll(`button`);n.forEach(e=>{e.addEventListener(`click`,()=>{n.forEach(e=>{e.className=e.className.replace(`btn-gold`,`btn-secondary`),e.className.includes(`btn-secondary`)||(e.className+=` btn-secondary`)}),e.className=e.className.replace(`btn-secondary`,`btn-gold`),t=e.dataset.suit})});let i=e.querySelector(`#bet-slider`),a=e.querySelector(`#slider-val`),o=e.querySelector(`#btn-confirm-bid`),c=e.querySelector(`#btn-skip-bid`);i.addEventListener(`input`,e=>{a.textContent=e.target.value}),o.addEventListener(`click`,()=>{let n=parseInt(i.value,10);o.disabled=!0,c.disabled=!0,e.querySelector(`h3`).textContent=`Submitting...`,T({action:`bet`,takes:n,suit:t})}),c.addEventListener(`click`,()=>{o.disabled=!0,c.disabled=!0,e.querySelector(`h3`).textContent=`Skipping...`,T({action:`bet`,takes:0,suit:`skip`})}),s.appendChild(e)}else{let t=r.min_bet,n=r.max_bet,i=r.restricted_bet,a=t;a===i&&(a+1<=n?a+=1:a-1>=t&&--a),e.innerHTML=`
        <h3 class="text-lg font-black text-white uppercase tracking-wider mb-1">Make Your Bid</h3>
        <p class="text-slate-400 text-[11px] font-medium mb-4" id="bid-limit-msg">Choose a bid from ${t} to ${n}</p>
        
        <div class="w-full flex flex-col items-center gap-4">
          <div class="text-4xl font-black text-amber-400 font-mono" id="slider-val">${a}</div>
          <input type="range" min="${t}" max="${n}" value="${a}" class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" id="bet-slider" />
          <div id="restricted-warning" class="text-rose-400 text-xs font-bold hidden">Sum cannot be 13. This bid is disabled.</div>
          <button id="btn-confirm-bet" class="btn btn-primary w-full py-3 mt-2">Confirm Bet</button>
        </div>
      `;let o=e.querySelector(`#bet-slider`),c=e.querySelector(`#slider-val`),l=e.querySelector(`#restricted-warning`),u=e.querySelector(`#btn-confirm-bet`),d=e=>{i!==void 0&&e===i?(l.classList.remove(`hidden`),u.disabled=!0,u.classList.add(`opacity-50`,`cursor-not-allowed`)):(l.classList.add(`hidden`),u.disabled=!1,u.classList.remove(`opacity-50`,`cursor-not-allowed`))};d(a),o.addEventListener(`input`,e=>{let t=parseInt(e.target.value,10);c.textContent=t,d(t)}),u.addEventListener(`click`,()=>{let t=parseInt(o.value,10);u.disabled=!0,o.disabled=!0,e.querySelector(`h3`).textContent=`Confirming...`,T({action:`bet`,takes:t})}),s.appendChild(e)}}let d=document.createElement(`div`);d.className=`w-full flex justify-center items-center h-28 relative mt-2 ${o&&n.is_turn?`pointer-events-auto`:`pointer-events-none`}`;let f={clubs:0,diamonds:1,spades:2,hearts:3},p=[...i].sort((e,t)=>{let n=f[e.suit]===void 0?99:f[e.suit],r=f[t.suit]===void 0?99:f[t.suit];return n===r?t.value-e.value:n-r}),m=p.length;p.forEach((e,t)=>{let r=U(e);r.style.position=`absolute`,r.style.left=`50%`;let i=(m-1)/2,a=(t-i)*32,s=(t-i)*2.5;r.style.transform=`translateX(calc(-50% + ${a}px)) rotate(${s}deg)`,r.style.transformOrigin=`50% 120%`,r.style.boxShadow=`0 4px 12px rgba(0,0,0,0.3)`,o&&n.is_turn&&(r.classList.add(`playable`),r.addEventListener(`click`,()=>{if(r.classList.contains(`selected`)){r.classList.remove(`selected`);let t=u.findIndex(t=>t.suit===e.suit&&t.value===e.value);t>-1&&u.splice(t,1)}else u.length<2&&(r.classList.add(`selected`),u.push(e));let t=document.getElementById(`exchange-count`),n=document.getElementById(`btn-confirm-exchange`);t&&(t.textContent=`${u.length} of 2 Selected`),n&&(n.disabled=u.length!==2)})),d.appendChild(r)}),s.appendChild(d),t.appendChild(s)}function q(e,t){t.innerHTML=``;let n=e.players||[],r=n[0]||{id:`p1`,is_turn:!1},i=e.table_cards||[],a=e.my_hand||[],o=document.createElement(`div`);o.className=`w-full h-full flex flex-col justify-between items-center p-4 relative`;let s=document.createElement(`div`);s.className=`table-felt w-full max-w-4xl flex-1 rounded-[40px] relative overflow-hidden flex items-center justify-center min-h-[220px] my-4`;let c=document.createElement(`div`);c.className=`grid grid-cols-3 grid-rows-3 gap-3 items-center justify-items-center w-72 h-72 relative z-10`;let l=[{row:3,col:2,name:`bottom`},{row:2,col:1,name:`left`},{row:1,col:2,name:`top`},{row:2,col:3,name:`right`}],u=e=>{let t=i.find(t=>t.player_id===e);return t?t.card:null};for(let e=1;e<=3;e++)for(let t=1;t<=3;t++){let r=document.createElement(`div`),a=l.findIndex(n=>n.row===e&&n.col===t);if(a!==-1){let e=n[a];if(r.className=`flex flex-col items-center justify-center gap-1 w-20 h-28 relative`,e){let t=u(e.id);if(t){let n=U(t,{small:!0});n.style.boxShadow=`0 6px 12px rgba(0,0,0,0.3)`,r.appendChild(n);let i=document.createElement(`div`);i.className=`text-[9px] font-bold text-slate-300 uppercase mt-1 bg-slate-950/60 px-1.5 py-0.5 rounded`,i.textContent=a===0?`You`:e.name,r.appendChild(i)}else r.className+=` border-2 border-dashed border-slate-700/30 rounded-lg flex items-center justify-center`,r.innerHTML=`
              <div class="text-[9px] font-black text-slate-600 uppercase text-center">
                ${a===0?`You`:e.name}
              </div>
            `}}else if(e===2&&t===2){r.className=`flex flex-col items-center justify-center w-full h-full text-center`;let e=e=>{switch(e){case`spades`:return`♠`;case`hearts`:return`♥`;case`diamonds`:return`♦`;case`clubs`:return`♣`;default:return``}},t=e=>e?e.charAt(0).toUpperCase()+e.slice(1):``;if(i.length>0){let n=i[0].card.suit;r.innerHTML=`
            <span class="text-[8px] font-bold text-emerald-500/40 uppercase tracking-widest">LEAD SUIT</span>
            <span class="text-sm font-black text-emerald-400 mt-1">${e(n)} ${t(n)}</span>
          `}else r.innerHTML=`
            <span class="text-[8px] font-bold text-emerald-600/40 uppercase tracking-widest">TABLE</span>
          `}else r.className=`w-20 h-28`;c.appendChild(r)}s.appendChild(c),o.appendChild(s);let d=document.createElement(`div`);d.className=`w-full flex justify-center items-center h-28 relative mt-2 pointer-events-auto`;let f={clubs:0,diamonds:1,spades:2,hearts:3},p=[...a].sort((e,t)=>{let n=f[e.suit]===void 0?99:f[e.suit],r=f[t.suit]===void 0?99:f[t.suit];return n===r?t.value-e.value:n-r}),m=p.length,h=r.is_turn;p.forEach((e,t)=>{let n=U(e);n.style.position=`absolute`,n.style.left=`50%`;let r=(m-1)/2,a=(t-r)*32,o=(t-r)*2.5;n.style.transform=`translateX(calc(-50% + ${a}px)) rotate(${o}deg)`,n.style.transformOrigin=`50% 120%`,n.style.boxShadow=`0 4px-12px rgba(0,0,0,0.3)`,h&&(()=>{if(i.length===0)return!0;let t=i[0].card.suit;return e.suit===t?!0:!p.some(e=>e.suit===t)})()?(n.classList.add(`playable`),n.addEventListener(`click`,()=>{d.querySelectorAll(`.game-card`).forEach(e=>{e.classList.add(`disabled`),e.classList.remove(`playable`)}),T({action:`play_card`,card:{suit:e.suit,value:e.value}})})):h?n.classList.add(`unplayable`):n.classList.add(`disabled`),d.appendChild(n)}),o.appendChild(d),t.appendChild(o)}function J(e,t){t.innerHTML=``;let n=e.players||[],r=e.game_stats||{round:1},i=document.createElement(`div`);i.className=`w-full h-full flex flex-col justify-center items-center p-4 bg-slate-950/90 backdrop-blur-md z-30 relative`;let a=document.createElement(`div`);a.className=`text-center mb-8 banner-animate`,a.innerHTML=`
    <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 uppercase tracking-widest leading-none">Round Completed</h2>
    <p class="text-slate-400 text-sm mt-2 font-medium">Round ${r.round} final standings & score adjustments</p>
  `,i.appendChild(a);let o=document.createElement(`div`);o.className=`glass p-6 w-full max-w-2xl border border-slate-800 shadow-2xl mb-8 relative z-10`;let s=document.createElement(`table`);s.className=`w-full text-left border-collapse`,s.innerHTML=`
    <thead>
      <tr class="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        <th class="pb-3 px-2">Player</th>
        <th class="pb-3 px-2 text-center">Bid</th>
        <th class="pb-3 px-2 text-center">Tricks Taken</th>
        <th class="pb-3 px-2 text-center">Status</th>
        <th class="pb-3 px-2 text-center">Score Change</th>
        <th class="pb-3 px-2 text-right">Total Score</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/40">
      ${n.map((e,t)=>{let n=t===0,r=e.tricks_taken||0,i=e.bet!==null&&e.bet!==void 0?e.bet:0,a=r===i,o=e.score_change===void 0?a?10+i*i:-Math.abs(i-r)*10:e.score_change,s=o>=0?`+${o}`:`${o}`,c=o>=0?`text-emerald-400 font-extrabold`:`text-rose-500 font-extrabold`,l=a?`<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Made</span>`:`<span class="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Missed</span>`,u=`text-slate-300`;return n&&(u=`text-white bg-slate-800/20 font-semibold`),`
          <tr class="${u}">
            <td class="py-3.5 px-2 text-sm">
              ${e.name} ${n?`<span class="text-[10px] text-slate-500 font-normal ml-1">(You)</span>`:``}
            </td>
            <td class="py-3.5 px-2 text-center font-mono font-bold">${i}</td>
            <td class="py-3.5 px-2 text-center font-mono font-bold">${r}</td>
            <td class="py-3.5 px-2 text-center">${l}</td>
            <td class="py-3.5 px-2 text-center font-mono ${c}">${s}</td>
            <td class="py-3.5 px-2 text-right font-mono font-black score-animate text-white">${e.score} <span class="text-[10px] text-slate-500 font-normal">pts</span></td>
          </tr>
        `}).join(``)}
    </tbody>
  `,o.appendChild(s),i.appendChild(o);let c=document.createElement(`button`);c.className=`btn btn-primary text-base px-8 py-3 relative z-10 flex items-center gap-2`,c.innerHTML=`<span>Next Round</span> <span>→</span>`,c.addEventListener(`click`,()=>{c.disabled=!0,c.textContent=`Waiting for players...`,T({action:`ready_next_round`})}),i.appendChild(c),t.appendChild(i)}function Y(e,t){t.innerHTML=``;let r=e.players||[],i=r[0]||{id:`p1`,name:`You`},a=e.winner||{id:``,name:`Unknown`},o=[...r].sort((e,t)=>t.score-e.score),s=document.createElement(`div`);s.className=`w-full h-full flex flex-col justify-center items-center p-4 bg-slate-950/95 z-30 relative overflow-hidden`;let c=a.id===i.id,l=c?50:15,u=[`#f59e0b`,`#10b981`,`#3b82f6`,`#ec4899`,`#ef4444`];for(let e=0;e<l;e++){let e=document.createElement(`div`);e.className=`particle`,e.style.backgroundColor=u[Math.floor(Math.random()*u.length)],e.style.left=`${Math.random()*100}%`,e.style.bottom=`0%`,e.style.animationDelay=`${Math.random()*2}s`,e.style.width=`${Math.random()*6+4}px`,e.style.height=e.style.width,s.appendChild(e)}let d=document.createElement(`div`);d.className=`glass banner-animate p-8 max-w-md w-full text-center border shadow-2xl mb-8 flex flex-col items-center relative z-10`,c?(d.classList.add(`border-amber-500/30`,`bg-amber-950/10`),d.innerHTML=`
      <div class="text-6xl mb-4 animate-bounce">🏆</div>
      <h1 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 tracking-wider mb-2">VICTORY!</h1>
      <p class="text-slate-300 text-sm font-semibold">Congratulations, you won the match!</p>
    `):(d.classList.add(`border-slate-800`,`bg-slate-900/40`),d.innerHTML=`
      <div class="text-5xl mb-4">🤝</div>
      <h1 class="text-3xl font-black text-slate-300 tracking-wider mb-2">GAME OVER</h1>
      <p class="text-slate-400 text-sm font-medium">Winner: <span class="text-amber-400 font-extrabold">${a.name}</span></p>
    `),s.appendChild(d);let f=document.createElement(`div`);f.className=`glass-sm p-6 w-full max-w-md border border-slate-800 shadow-xl mb-8 relative z-10`,f.innerHTML=`
    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-4">Final Standings</h3>
  `;let p=document.createElement(`table`);p.className=`w-full text-left border-collapse`,p.innerHTML=`
    <thead>
      <tr class="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
        <th class="pb-2">Rank</th>
        <th class="pb-2">Player</th>
        <th class="pb-2 text-right">Final Score</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800/40">
      ${o.map((e,t)=>{let n=e.id===a.id,r=e.id===i.id,o=`text-slate-300`;n?o=`text-amber-400 font-bold bg-amber-500/5`:r&&(o=`text-white font-medium bg-slate-800/20`);let s=t===0?`🥇`:t===1?`🥈`:t===2?`🥉`:`#${t+1}`;return`
          <tr class="${o}">
            <td class="py-3 px-1.5 text-sm">${s}</td>
            <td class="py-3 px-1.5 text-sm">
              ${e.name} ${r?`<span class="text-[10px] text-slate-500 font-normal ml-1">(You)</span>`:``}
            </td>
            <td class="py-3 px-1.5 text-sm font-mono font-black text-right">${e.score} <span class="text-[10px] text-slate-500 font-normal">pts</span></td>
          </tr>
        `}).join(``)}
    </tbody>
  `,f.appendChild(p),s.appendChild(f);let m=document.createElement(`button`);m.className=`btn btn-primary text-base px-8 py-3 relative z-10`,m.textContent=`Return to Lobby`,m.addEventListener(`click`,()=>{m.disabled=!0,m.textContent=`Resetting...`,T({action:`return_menu`}),n(N(`LOBBY`))}),s.appendChild(m),t.appendChild(s)}function X(e,t){t.innerHTML=``;let n=e.players||[],r=e.game_stats||{round:0,target_score:100},i=E(),a=e.current_stage||`PLAYING`,o=document.createElement(`div`);o.className=`absolute top-4 right-4 flex items-center gap-2 glass-sm px-3 py-1.5 pointer-events-auto z-20`;let s=`status-dot disconnected`,c=`Disconnected`;i===`connected`?(s=`status-dot connected`,c=`Connected`):i===`connecting`&&(s=`status-dot connecting`,c=`Connecting...`),o.innerHTML=`
    <span class="${s}"></span>
    <span class="text-xs font-semibold text-slate-300">${c}</span>
  `,t.appendChild(o);let l=document.createElement(`div`);l.className=`absolute top-4 left-4 glass-sm px-4 py-2 flex flex-col justify-center pointer-events-auto z-20`;let u=r.play_style?` | Play: ${r.play_style}`:``,d=r.bidding_stage&&a===`BETTING`?` (${r.bidding_stage})`:``;function f(e){switch(e){case`spades`:return`♠`;case`hearts`:return`♥`;case`diamonds`:return`♦`;case`clubs`:return`♣`;default:return``}}function p(e){return e?e.split(`_`).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(` `):``}l.innerHTML=`
    <div class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Israeli Whist${u}${r.trump_suit&&r.trump_suit!==`no_trump`?` | Trump: ${p(r.trump_suit)} ${f(r.trump_suit)}`:r.trump_suit===`no_trump`?` | Trump: NT`:``}</div>
    <div class="text-xl font-black text-white font-mono leading-none mt-1">Round ${r.round}${d}</div>
    <div class="text-[10px] text-amber-400 font-semibold mt-1">Target: ${r.target_score}</div>
  `,t.appendChild(l);let m=[`bottom-6 left-6`,`left-6 top-[35%] -translate-y-1/2`,`top-4 left-1/2 -translate-x-1/2`,`right-6 top-[35%] -translate-y-1/2`];for(let e=0;e<4;e++){let r=n[e];if(!r)continue;let i=e===0,o=r.is_turn,s=r.status===`Thinking...`,c=document.createElement(`div`);if(c.className=`absolute ${m[e]} flex flex-col items-center pointer-events-auto transition-all duration-300 z-20`,r.status&&!i){let t=document.createElement(`div`),n=`bottom-full mb-2`;e===1&&(n=`left-full ml-2 top-1/2 -translate-y-1/2`),e===3&&(n=`right-full mr-2 top-1/2 -translate-y-1/2`),t.className=`absolute ${n} glass-sm px-2.5 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700/50 shadow-lg whitespace-nowrap`,s?t.innerHTML=`
          <span>Thinking</span>
          <span class="inline-flex items-center ml-0.5">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
          </span>
        `:t.textContent=r.status,c.appendChild(t)}let l=document.createElement(`div`);l.className=`glass-sm px-4 py-3 flex flex-col items-center min-w-32 border-2 transition-all duration-300 ${o?`turn-glow border-emerald-500`:`border-slate-700/30`}`;let u=``;if(a===`PLAYING`||a===`ROUND_END`){let e=r.tricks_taken||0,t=r.bet!==null&&typeof r.bet==`object`?r.bet.takes:r.bet;u=`
        <div class="text-[11px] font-bold mt-1.5 flex flex-col items-center">
          <span class="text-slate-400 text-[9px] uppercase tracking-wider">Tricks Taken</span>
          <span class="text-emerald-400 text-sm font-mono mt-0.5">${e} <span class="text-slate-500 text-xs">/ ${t!=null&&t!==`skip`?t:`-`}</span></span>
        </div>
      `}else r.bet!==null&&r.bet!==void 0&&r.bet!==`skip`&&(u=`
        <div class="text-[11px] font-bold mt-1.5 flex flex-col items-center">
          <span class="text-slate-400 text-[9px] uppercase tracking-wider">Bet Bid</span>
          <span class="text-amber-400 font-mono mt-0.5">${typeof r.bet==`object`?r.bet.takes:r.bet}</span>
        </div>
      `);if(l.innerHTML=`
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide">${i?`You`:r.name}</div>
      <div class="text-lg font-black text-white font-mono mt-0.5">${r.score} <span class="text-xs text-amber-400 font-normal">Score</span></div>
      ${u}
      ${o?`<div class="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider animate-pulse mt-1">Your Turn</div>`:``}
    `,c.appendChild(l),(a===`PLAYING`||a===`BETTING`)&&!i&&r.hand_size!==void 0){let e=document.createElement(`div`);e.className=`relative flex justify-center items-center h-12 mt-3 w-full`;let t=r.hand_size,n=document.createElement(`div`);n.className=`relative h-10 w-full flex justify-center`;for(let e=0;e<t;e++){let r=W({mini:!0});r.style.position=`absolute`;let i=(t-1)/2,a=`translateX(${(e-i)*8}px)`,o=(e-i)*2;a+=` rotate(${o}deg)`,r.style.transform=a,r.style.transformOrigin=`50% 100%`,r.style.zIndex=e,n.appendChild(r)}e.appendChild(n),c.appendChild(e)}t.appendChild(c)}}function Z(){d(),f(`LOBBY`,F),f(`DEALING`,G),f(`BETTING`,K),f(`PLAYING`,q),f(`ROUND_END`,J),f(`GAME_OVER`,Y),i(e=>{p(e);let t=document.getElementById(`hud`);t&&[`DEALING`,`BETTING`,`PLAYING`,`ROUND_END`].includes(e.current_stage)&&X(e,t)}),C(e=>{if(e&&e.type===`error`){ee(e.reason||e.error_type);let t=r();t&&n({...t})}else n(e)}),Q(),n(N(`LOBBY`))}function Q(){let e=document.getElementById(`dev-controls`),t=document.getElementById(`dev-prev`),r=document.getElementById(`dev-next`);e&&(e.style.display=``);let i=m();t&&t.addEventListener(`click`,()=>{n(N(i[(i.indexOf(h())-1+i.length)%i.length]))}),r&&r.addEventListener(`click`,()=>{n(N(i[(i.indexOf(h())+1)%i.length]))}),document.addEventListener(`keydown`,e=>{e.key===`[`||e.key===`ArrowLeft`&&e.ctrlKey?t?.click():(e.key===`]`||e.key===`ArrowRight`&&e.ctrlKey)&&r?.click()})}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,Z):Z();var $={must_follow_suit:`Must follow the lead suit!`,card_not_in_hand:`Card is not in your hand!`,not_your_turn:`It's not your turn!`};function ee(e){let t=$[e]||e,n=document.getElementById(`toast-container`);n||(n=document.createElement(`div`),n.id=`toast-container`,n.className=`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4`,document.body.appendChild(n));let r=document.createElement(`div`);r.className=`glass-sm px-4 py-3 shadow-2xl border border-rose-500/30 text-xs font-bold text-rose-200 flex items-center justify-center gap-2 transition-all duration-300 transform -translate-y-4 opacity-0 pointer-events-auto cursor-pointer`;let i=document.createElement(`span`);i.textContent=`⚠️`,i.className=`text-rose-400 text-sm`,r.appendChild(i);let a=document.createElement(`span`);a.textContent=t,r.appendChild(a),r.addEventListener(`click`,()=>{r.remove()}),n.appendChild(r),requestAnimationFrame(()=>{r.classList.remove(`-translate-y-4`,`opacity-0`)}),setTimeout(()=>{r.parentNode&&(r.classList.add(`-translate-y-4`,`opacity-0`),r.addEventListener(`transitionend`,()=>{r.remove(),n.children.length===0&&n.remove()}))},3e3)}