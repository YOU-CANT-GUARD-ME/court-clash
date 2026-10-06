// BLOODSWORN — translations, shared by every page.
//
// tr('key', { name: 'Aldric' }) returns the text in the chosen language, with
// {placeholders} filled in. English is the fallback for anything missing.
// In HTML, data-i18n="key" sets an element's text (and data-i18n-placeholder,
// -title and -aria set those attributes); applyI18n() fills them in.
// The language is remembered per browser; the first visit follows the
// browser's own language.

const LANG_KEY = 'bloodsworn.lang';
const LANGS = { en: 'English', ko: '한국어' };

const STRINGS = {
    en: {
        // shared
        'brand.sub': 'MERCENARIES OF THE ASHEN REALM',
        'map.keep': 'ASHEN KEEP', 'map.wood': 'BLIGHTED WOOD', 'map.frost': 'FROZEN PASS',
        'mode.hunt': 'THE HUNT',
        'mode.duel': 'THE DUEL',
        'ctl.move': 'Move', 'ctl.fire': 'Fire', 'ctl.roll': 'Roll', 'ctl.firepot': 'Firepot',
        'ctl.reload': 'Reload', 'ctl.pause': 'Pause', 'ctl.fullscreen': 'Fullscreen',
        'key.click': 'CLICK', 'key.space': 'SPACE',
        'hud.bolts': 'BOLTS', 'hud.reload': 'RELOAD',
        'btn.hall': 'THE HALL',

        // lobby: loading screen
        'load.kindle': 'Kindling the torches…',
        'load.sharpen': 'Sharpening steel…',
        'load.rouse': 'Rousing the sellswords…',
        'load.slow': 'The gatekeeper is slow to wake…',
        'load.open': 'The gates open.',
        'lore.0': 'Gold buys steel. Steel buys gold.',
        'lore.1': 'A sellsword’s oath lasts exactly as long as his pay.',
        'lore.2': 'The Ashen Realm remembers every debt.',
        'lore.3': 'Fight for coin. Die for nothing.',
        'lore.4': 'No banner flies over the Bloodsworn.',
        // lobby: header
        'hdr.armory': 'ARMORY', 'hdr.legends': 'LEGENDS', 'hdr.gold': 'GOLD',
        'hdr.goldTitle': 'Gold earned in battle',
        'hdr.leave': 'LEAVE', 'hdr.leaveTitle': 'Log out of this account',
        'hdr.settings': 'Settings',
        // lobby: warband
        'lobby.title': 'YOUR WARBAND',
        'status.connecting': 'CONNECTING…',
        'status.offline': 'OFFLINE · RECONNECTING…',
        'status.notSworn': 'NOT YET SWORN IN',
        'status.sworn': 'SWORN AS {name}',
        'status.replaced': 'OPENED IN ANOTHER TAB',
        'count.aria': '{n} of {max} players',
        'slot.empty': 'UNCLAIMED', 'slot.emptySub': 'Awaiting a sellsword',
        'slot.reconnecting': 'RECONNECTING…', 'slot.captain': 'CAPTAIN', 'slot.sellsword': 'SELLSWORD',
        'slot.you': 'YOU', 'slot.captainTitle': 'Captain',
        'seal.label': 'WARBAND SEAL', 'seal.hint': "SHARE YOURS, OR ENTER AN ALLY'S",
        'seal.copy': 'COPY', 'seal.join': 'JOIN', 'seal.copied': 'COPIED!',
        'picked.label': 'CONTRACT',
        'who.you': 'YOU CHOOSE THE CONTRACT', 'who.leader': '{name} CHOOSES · ',
        'leaveWarband': 'LEAVE WARBAND',
        'mode.huntSub': 'Survive the horde', 'mode.duelSub': 'Best of three',
        'mode.skirmish': 'SKIRMISH 2V2', 'mode.skirmishSub': 'Two against two',
        'sides.title': 'SKIRMISH SIDES', 'sides.shuffle': 'SHUFFLE',
        'sides.hintCaptain': 'Tap a name, then a name or open place on the other banner, to swap or move them.',
        'sides.hintMember': 'The captain chooses the sides.',
        'sides.solo': 'Alone? You’ll be paired with sellswords from the realm.',
        'play': 'TO BATTLE',
        // lobby: sign in
        'auth.title': 'WHO GOES THERE?',
        'auth.subSignup': 'NAME THYSELF, SELLSWORD', 'auth.subLogin': 'WELCOME BACK, SELLSWORD',
        'auth.tabSignup': 'NEW SELLSWORD', 'auth.tabLogin': 'RETURNING',
        'auth.name': 'NAME', 'auth.namePh': '3–16 letters, numbers or _',
        'auth.password': 'PASSWORD', 'auth.passwordPh': 'At least 6 characters',
        'auth.btnSignup': 'SWEAR IN', 'auth.btnLogin': 'RETURN TO THE HALL',
        'auth.unreachable': 'The hall is unreachable. Retrying…',
        // lobby: hall of legends
        'close': 'Close',
        'legends.title': 'HALL OF LEGENDS', 'legends.sub': 'THE REALM REMEMBERS',
        'legends.hunt': 'THE HUNT · BOUNTIES', 'legends.duel': 'THE DUEL · VICTORIES',
        'legends.skirmish': 'SKIRMISH · VICTORIES', 'legends.noSkirmish': 'No skirmishes fought yet.',
        'legends.loading': 'Consulting the chronicles…',
        'legends.noHunt': 'No bounties claimed yet.', 'legends.noDuel': 'No duels fought yet.',
        'legends.failed': 'The chronicles could not be reached. Try again shortly.',
        'legends.bountyRow': '{bounty} · W{wave}',
        'stat.gold': 'GOLD', 'stat.bestBounty': 'BEST BOUNTY', 'stat.bestWave': 'BEST WAVE',
        'stat.kills': 'KILLS', 'stat.hunts': 'HUNTS', 'stat.duels': 'DUELS',
        'stat.skirmishes': 'SKIRMISHES',
        // lobby: armory
        'armory.title': 'THE ARMORY', 'armory.sub': 'STEEL FOR THE HUNT',
        'armory.purseBefore': 'Your purse holds ',
        'armory.purseAfter': ' gold. Every upgrade lasts for good and is ready on your next Hunt.',
        'armory.mastered': 'MASTERED', 'armory.forge': 'FORGE · {cost} GOLD',
        'armory.level': 'Level {n} of {max}',
        'armory.signIn': 'Swear in before you visit the smith.',
        // lobby: settings
        'settings.title': 'SETTINGS', 'settings.sub': 'SET YOUR TERMS', 'settings.language': 'LANGUAGE',

        // hunt
        'foe.knight': 'DREAD KNIGHT', 'foe.sapper': 'SAPPER', 'foe.warlord': 'WARLORD {tier}',
        'hud.bounty': 'BOUNTY', 'hud.wave': 'WAVE',
        'hud.gathers': 'THE NEXT WAVE GATHERS', 'hud.foe': '1 FOE REMAINS', 'hud.foes': '{n} FOES REMAIN',
        'hud.clear': 'THE FIELD IS CLEAR',
        'hud.health': 'HEALTH', 'hud.firepots': 'FIREPOTS', 'hud.reserve': '+{n} RESERVE',
        'hud.berserk': 'BERSERK', 'hud.warMap': 'WAR MAP',
        'chip.warded': 'WARDED', 'chip.dmg': 'DMG ×{n}', 'chip.speed': 'SPEED {n}', 'chip.armor': 'ARMOR {n}%',
        'pu.heal': "HEALER'S DRAUGHT", 'pu.healDesc': 'Restore your health in full',
        'pu.ammo': 'BOLT QUIVER', 'pu.ammoDesc': 'More bolts, grows each wave',
        'pu.speed': 'FLEET BOOTS', 'pu.speedDesc': 'Move faster, a modest gain',
        'pu.damage': 'HEAVY BOLTS', 'pu.damageDesc': 'Bolt damage up, scales per wave',
        'pu.firepot': 'FIREPOT SATCHEL', 'pu.firepotDesc': 'More firepots, more per wave',
        'pu.armor': 'IRON SKIN', 'pu.armorDesc': 'Damage reduction, stacks to 95%',
        'pu.effHeal': '{from} → {to} HP', 'pu.effAmmo': '+{n} BOLTS', 'pu.effDamage': 'DMG {from} → {to}',
        'pu.effFirepot': '+{n} FIREPOTS',
        'spoils.title': 'CLAIM YOUR SPOILS', 'spoils.sub': 'WAVE {n} REPELLED  ·  CHOOSE ONE',
        'spoils.boon': 'BOON', 'spoils.hint': 'CLICK A CARD  OR  PRESS 1–3',
        'over.slain': 'SLAIN', 'over.sub': 'YOUR CONTRACT ENDS IN BLOOD',
        'over.bounty': 'BOUNTY', 'over.wave': 'WAVE', 'over.kills': 'KILLS', 'over.best': 'BEST',
        'over.newBest': 'A NEW LEGEND!',
        'reward.saving': 'ENTERING YOUR BOUNTY IN THE LEDGER…',
        'reward.saved': '+{n} GOLD FOR YOUR PURSE',
        'reward.guest': 'SIGN IN AT THE HALL TO EARN GOLD',
        'reward.failed': 'THE LEDGER COULD NOT BE REACHED. THIS BOUNTY IS LOST',
        'btn.riseAgain': 'RISE AGAIN', 'btn.retreat': 'RETREAT', 'btn.resume': 'RESUME',
        'clear.title': 'WAVE {n} REPELLED', 'clear.sub': '+500 BOUNTY  ·  SPOILS AWAIT',
        'count.boss': 'A WARLORD COMES', 'count.wave': 'WAVE {n}',
        'count.bossSub': 'SURVIVE THE ONSLAUGHT', 'count.waveSub': 'STEEL YOURSELF',
        'pause.title': 'RESPITE', 'pause.sub': 'THE BATTLE WAITS', 'pause.controls': 'CONTROLS',

        // duel
        'duel.lost': 'CONNECTION LOST', 'duel.lostText': 'The match server disconnected.',
        'duel.failed': 'CONNECTION FAILED',
        'duel.failedText': 'No answer from the match server. It may still be waking, so try again in a few seconds.',
        'duel.elsewhere': 'OPENED ELSEWHERE', 'duel.elsewhereTag': 'ANOTHER TAB TOOK OVER',
        'duel.elsewhereText': 'Your account was opened in another tab, so this one has been disconnected.',
        'duel.victory': 'VICTORY', 'duel.defeat': 'DEFEAT', 'duel.finalScore': 'FINAL SCORE',
        'duel.fled': 'YOUR FOE FLED', 'duel.forfeit': 'VICTORY BY FORFEIT',
        'duel.you': 'YOU', 'duel.vs': 'VS', 'duel.foe': 'FOE', 'duel.or': ' or ',
        'duel.partyTag': 'WARBAND DUEL  ·  BEST OF THREE',
        'duel.partyText': 'You ride with a warband, so you’ll face {names}. First to two victories claims the purse.',
        'duel.publicTag': 'TRIAL BY COMBAT  ·  BEST OF THREE',
        'duel.publicText': 'Face another sellsword in single combat. First to two victories claims the purse.',
        'duel.seek': 'SEEK A DUEL',
        'duel.seeking': 'SEEKING', 'duel.awaitParty': 'AWAITING YOUR WARBAND', 'duel.awaitFoe': 'SEEKING A WORTHY FOE',
        'duel.awaitPartyText': 'The duel begins as soon as {names} takes up arms.',
        'duel.awaitFoeText': 'Hold fast. The duel begins the moment another sellsword answers.',
        'duel.withdraw': 'WITHDRAW',
        'duel.decided': 'MATCH DECIDED', 'duel.nextRound': 'ROUND {n} STARTING', 'duel.getReady': 'GET READY',
        'duel.roundWon': 'ROUND WON', 'duel.roundLost': 'ROUND LOST', 'duel.roundDone': 'ROUND {n} COMPLETE',
        'duel.purse': '+{n} gold for your purse.',
        'duel.purseGuest': 'Sign in at the hall to earn gold and a place among the legends.',
        'duel.rematch': 'REMATCH', 'duel.another': 'SEEK ANOTHER',
        'duel.server': 'MATCH SERVER', 'duel.retry': 'TRY AGAIN',
        'duel.round': 'ROUND {n}', 'duel.fight': 'FIGHT!',
        'duel.deciding': 'DECIDING ROUND', 'duel.matchPoint': 'MATCH POINT', 'duel.bestOf3': 'BEST OF THREE',
        'duel.lineTag': 'WINNER STAYS ON',
        'duel.lineRule': 'Winner stays on: the victor faces the next in line, and the loser goes to the back.',
        'duel.fightRow': 'ROUND {round} · {a}–{b}',
        'duel.lineNext': 'YOU ARE NEXT IN LINE', 'duel.linePos': 'YOU ARE #{n} IN LINE',
        'duel.holdField': 'YOU HOLD THE FIELD · YOUR NEXT FOE STEPS UP SHORTLY',
        'duel.toBack': 'TO THE BACK OF THE LINE · YOUR TURN WILL COME AGAIN',

        // skirmish
        'sk.title': 'SKIRMISH', 'sk.tag': 'TWO AGAINST TWO  ·  BEST OF THREE',
        'sk.soloText': 'Two against two. You’ll be paired with another sellsword against two foes. The first band to win two rounds claims the purse.',
        'sk.partyText': 'Your warband fights on the sides your captain chose. Open places are filled by sellswords from the realm.',
        'sk.gold': 'GOLD BANNER', 'sk.crimson': 'CRIMSON BANNER', 'sk.open': 'Open place',
        'sk.seek': 'SEEK A SKIRMISH',
        'sk.gathering': 'GATHERING', 'sk.gatherText': 'Waiting for your warband to arrive: {arrived} of {total} here.',
        'sk.seekTag': 'MUSTERING THE BANDS', 'sk.seekText': 'Mustering sellswords for the fight: {found} of 4 found.',
        'sk.yourBand': 'YOUR BAND', 'sk.foes': 'FOES', 'sk.down': 'DOWN', 'sk.fled': 'FLED',
        'sk.spectate': 'YOU ARE DOWN  ·  WATCHING {name}', 'sk.downAlone': 'YOU ARE DOWN',
        'sk.felled': '{a} FELLED {b}', 'sk.left': '{name} FLED THE FIELD',
        'sk.again': 'FIGHT AGAIN',

        // wardrobe
        'hdr.mercenary': "MERCENARY",
        'wd.title': "YOUR MERCENARY",
        'wd.sub': "DRESS FOR THE SLAUGHTER",
        'wd.purseAfter': " gold. Looks change nothing in battle but how you are seen.",
        'wd.tab.cloak': "CLOAK",
        'wd.tab.helm': "HELM",
        'wd.tab.trim': "TRIM & METAL",
        'wd.tab.trail': "BOLT TRAIL",
        'wd.tab.title': "TITLE",
        'wd.worn': "WORN",
        'wd.wear': "WEAR",
        'wd.free': "FREE",
        'wd.buy': "BUY · {cost} GOLD",
        'wd.signIn': "Swear in to dress your mercenary.",
        'wd.cloak.umber': "Umber",
        'wd.cloak.moss': "Moss",
        'wd.cloak.slate': "Slate",
        'wd.cloak.wine': "Wine",
        'wd.cloak.midnight': "Midnight",
        'wd.cloak.ash': "Ash White",
        'wd.cloak.blood': "Blood Red",
        'wd.cloak.raven': "Raven Black",
        'wd.trim.brass': "Brass",
        'wd.trim.iron': "Iron",
        'wd.trim.bronze': "Bronze",
        'wd.trim.silver': "Silver",
        'wd.trim.blackiron': "Black Iron",
        'wd.trim.gilded': "Gilded",
        'wd.helm.sallet': "Sallet",
        'wd.helm.hood': "Hood",
        'wd.helm.great': "Great Helm",
        'wd.helm.horned': "Horned Helm",
        'wd.helm.crowned': "Crowned Helm",
        'wd.trail.none': "None",
        'wd.trail.ember': "Ember",
        'wd.trail.frost': "Frost",
        'wd.trail.venom': "Venom",
        'wd.trail.blood': "Blood",
        'wd.trail.shadow': "Shadow",
        'title.none': "No title",
        'title.sellsword': "the Sellsword",
        'title.relentless': "the Relentless",
        'title.butcher': "the Butcher",
        'title.slayer': "Slayer of Hordes",
        'title.survivor': "the Survivor",
        'title.warlordbane': "Warlord’s Bane",
        'title.duelist': "the Duelist",
        'title.champion': "Champion of the Pit",
        'title.brother': "Brother-in-Arms",
        'title.warmaster': "Warmaster",
        'rule.huntRuns': "Finish {n} Hunts",
        'rule.totalKills': "Fell {n} foes in the Hunt",
        'rule.bestWave': "Reach wave {n} in the Hunt",
        'rule.duelWins': "Win {n} Duels",
        'rule.skirmishWins': "Win {n} Skirmishes",
        // the Prism event
        'event.title': 'THE PRISM', 'event.daysLeft': '{n} DAYS LEFT', 'event.hoursLeft': '{n} HOURS LEFT',
        'event.text': 'A rare rainbow bolt may fire during the Hunt. Strike a foe with it to win the limited Prismatic Trail.',
        'event.owned': 'You hold the Prismatic Trail. Wear it from the Mercenary room.',
        'wd.trail.prismatic': 'Prismatic', 'wd.limitedActive': 'LIMITED · WIN IN THE HUNT', 'wd.limitedGone': 'LIMITED · NO LONGER OBTAINABLE',
        'prism.stirs': 'THE PRISM STIRS!', 'prism.stirsSub': 'STRIKE A FOE WITH THE RAINBOW BOLT',
        'prism.claiming': 'A TRUE STRIKE…',
        'prism.won': 'PRISMATIC TRAIL CLAIMED', 'prism.wonSub': 'WEAR IT FROM THE MERCENARY ROOM',
        'prism.missed': 'THE PRISM FADES…', 'prism.missedSub': 'IT MAY RETURN IN ANOTHER HUNT',
        'prism.failed': 'THE PRISM COULD NOT BE CLAIMED',
    },

    ko: {
        // shared
        'brand.sub': '잿빛 왕국의 용병들',
        'map.keep': '잿빛 성채', 'map.wood': '병든 숲', 'map.frost': '얼어붙은 고개',
        'mode.hunt': '사냥',
        'mode.duel': '결투',
        'ctl.move': '이동', 'ctl.fire': '발사', 'ctl.roll': '구르기', 'ctl.firepot': '화염병',
        'ctl.reload': '재장전', 'ctl.pause': '일시정지', 'ctl.fullscreen': '전체화면',
        'key.click': '클릭', 'key.space': '스페이스',
        'hud.bolts': '화살', 'hud.reload': '재장전',
        'btn.hall': '전당으로',

        // lobby: loading screen
        'load.kindle': '횃불을 밝히는 중…',
        'load.sharpen': '칼날을 벼리는 중…',
        'load.rouse': '용병들을 깨우는 중…',
        'load.slow': '문지기가 좀처럼 깨어나지 않는군…',
        'load.open': '성문이 열린다.',
        'lore.0': '금화로 강철을 사고, 강철로 금화를 번다.',
        'lore.1': '용병의 맹세는 딱 품삯만큼만 간다.',
        'lore.2': '잿빛 왕국은 모든 빚을 기억한다.',
        'lore.3': '금화를 위해 싸우고, 아무것도 없이 죽는다.',
        'lore.4': '블러드스원 위에는 어떤 깃발도 나부끼지 않는다.',
        // lobby: header
        'hdr.armory': '무기고', 'hdr.legends': '전설', 'hdr.gold': '금화',
        'hdr.goldTitle': '전투로 번 금화',
        'hdr.leave': '로그아웃', 'hdr.leaveTitle': '이 계정에서 로그아웃',
        'hdr.settings': '설정',
        // lobby: warband
        'lobby.title': '나의 전투단',
        'status.connecting': '연결 중…',
        'status.offline': '오프라인 · 다시 연결 중…',
        'status.notSworn': '아직 입단하지 않음',
        'status.sworn': '맹세한 이름: {name}',
        'status.replaced': '다른 탭에서 열림',
        'count.aria': '{max}명 중 {n}명',
        'slot.empty': '빈 자리', 'slot.emptySub': '용병을 기다리는 중',
        'slot.reconnecting': '다시 연결 중…', 'slot.captain': '대장', 'slot.sellsword': '용병',
        'slot.you': '나', 'slot.captainTitle': '대장',
        'seal.label': '전투단 인장', 'seal.hint': '내 인장을 공유하거나 동료의 인장을 입력하세요',
        'seal.copy': '복사', 'seal.join': '합류', 'seal.copied': '복사됨!',
        'picked.label': '계약',
        'who.you': '당신이 계약을 고릅니다', 'who.leader': '{name} 님이 고릅니다 · ',
        'leaveWarband': '전투단 떠나기',
        'mode.huntSub': '몰려오는 적을 버텨내라', 'mode.duelSub': '3판 2선승',
        'mode.skirmish': '2대2 접전', 'mode.skirmishSub': '둘 대 둘',
        'sides.title': '접전 편 나누기', 'sides.shuffle': '섞기',
        'sides.hintCaptain': '이름을 누른 뒤 반대편의 이름이나 빈자리를 누르면 바꾸거나 옮깁니다.',
        'sides.hintMember': '편은 대장이 정합니다.',
        'sides.solo': '혼자인가요? 왕국의 용병들과 짝을 이룹니다.',
        'play': '전투 개시',
        // lobby: sign in
        'auth.title': '거기 누구냐?',
        'auth.subSignup': '이름을 밝혀라, 용병이여', 'auth.subLogin': '돌아온 것을 환영한다, 용병이여',
        'auth.tabSignup': '신입 용병', 'auth.tabLogin': '복귀',
        'auth.name': '이름', 'auth.namePh': '영문·숫자·_ 3–16자',
        'auth.password': '비밀번호', 'auth.passwordPh': '6자 이상',
        'auth.btnSignup': '입단 맹세', 'auth.btnLogin': '전당으로 복귀',
        'auth.unreachable': '전당에 닿을 수 없습니다. 다시 시도하는 중…',
        // lobby: hall of legends
        'close': '닫기',
        'legends.title': '전설의 전당', 'legends.sub': '왕국은 기억한다',
        'legends.hunt': '사냥 · 현상금', 'legends.duel': '결투 · 승리',
        'legends.skirmish': '접전 · 승리', 'legends.noSkirmish': '아직 치러진 접전이 없습니다.',
        'legends.loading': '연대기를 살피는 중…',
        'legends.noHunt': '아직 현상금을 받은 이가 없습니다.', 'legends.noDuel': '아직 치러진 결투가 없습니다.',
        'legends.failed': '연대기에 닿을 수 없습니다. 잠시 후 다시 시도하세요.',
        'legends.bountyRow': '{bounty} · {wave}웨이브',
        'stat.gold': '금화', 'stat.bestBounty': '최고 현상금', 'stat.bestWave': '최고 웨이브',
        'stat.kills': '처치', 'stat.hunts': '사냥 횟수', 'stat.duels': '결투 전적',
        'stat.skirmishes': '접전 전적',
        // lobby: armory
        'armory.title': '무기고', 'armory.sub': '사냥을 위한 강철',
        'armory.purseBefore': '지갑에 금화 ',
        'armory.purseAfter': '닢이 있습니다. 모든 강화는 영구적이며 다음 사냥부터 적용됩니다.',
        'armory.mastered': '최고 단계', 'armory.forge': '제련 · 금화 {cost}',
        'armory.level': '{max}단계 중 {n}단계',
        'armory.signIn': '대장장이를 찾기 전에 먼저 입단하세요.',
        // lobby: settings
        'settings.title': '설정', 'settings.sub': '나만의 조건', 'settings.language': '언어',

        // hunt
        'foe.knight': '공포의 기사', 'foe.sapper': '공병', 'foe.warlord': '군벌 {tier}',
        'hud.bounty': '현상금', 'hud.wave': '웨이브',
        'hud.gathers': '다음 웨이브가 모여든다', 'hud.foe': '남은 적 1', 'hud.foes': '남은 적 {n}',
        'hud.clear': '전장이 비었다',
        'hud.health': '체력', 'hud.firepots': '화염병', 'hud.reserve': '예비 +{n}',
        'hud.berserk': '광폭화', 'hud.warMap': '전황도',
        'chip.warded': '보호됨', 'chip.dmg': '피해 ×{n}', 'chip.speed': '속도 {n}', 'chip.armor': '방어 {n}%',
        'pu.heal': '치유사의 물약', 'pu.healDesc': '체력을 모두 회복합니다',
        'pu.ammo': '화살 묶음', 'pu.ammoDesc': '화살 추가, 웨이브마다 증가',
        'pu.speed': '날쌘 장화', 'pu.speedDesc': '이동 속도가 조금 오릅니다',
        'pu.damage': '무거운 화살', 'pu.damageDesc': '화살 피해 증가, 웨이브마다 강해짐',
        'pu.firepot': '화염병 주머니', 'pu.firepotDesc': '화염병 추가, 웨이브마다 증가',
        'pu.armor': '강철 피부', 'pu.armorDesc': '피해 감소, 최대 95%까지 중첩',
        'pu.effHeal': '체력 {from} → {to}', 'pu.effAmmo': '화살 +{n}', 'pu.effDamage': '피해 {from} → {to}',
        'pu.effFirepot': '화염병 +{n}',
        'spoils.title': '전리품을 챙겨라', 'spoils.sub': '{n}웨이브 격퇴  ·  하나를 고르세요',
        'spoils.boon': '은총', 'spoils.hint': '카드를 클릭하거나 1–3을 누르세요',
        'over.slain': '전사', 'over.sub': '그대의 계약은 피로 끝났다',
        'over.bounty': '현상금', 'over.wave': '웨이브', 'over.kills': '처치', 'over.best': '최고',
        'over.newBest': '새로운 전설!',
        'reward.saving': '장부에 현상금을 기록하는 중…',
        'reward.saved': '금화 +{n}, 지갑에 넣었다',
        'reward.guest': '금화를 벌려면 전당에서 로그인하세요',
        'reward.failed': '장부에 닿지 못했습니다. 이번 현상금은 사라졌습니다',
        'btn.riseAgain': '다시 일어서기', 'btn.retreat': '후퇴', 'btn.resume': '계속',
        'clear.title': '{n}웨이브 격퇴', 'clear.sub': '현상금 +500  ·  전리품이 기다린다',
        'count.boss': '군벌이 온다', 'count.wave': '{n}웨이브',
        'count.bossSub': '맹공을 버텨내라', 'count.waveSub': '마음을 단단히 먹어라',
        'pause.title': '휴식', 'pause.sub': '전투가 기다린다', 'pause.controls': '조작법',

        // duel
        'duel.lost': '연결 끊김', 'duel.lostText': '대전 서버와의 연결이 끊어졌습니다.',
        'duel.failed': '연결 실패',
        'duel.failedText': '대전 서버가 응답하지 않습니다. 아직 깨어나는 중일 수 있으니 몇 초 뒤 다시 시도하세요.',
        'duel.elsewhere': '다른 곳에서 열림', 'duel.elsewhereTag': '다른 탭이 이어받았습니다',
        'duel.elsewhereText': '다른 탭에서 계정이 열려 이 탭의 연결이 끊어졌습니다.',
        'duel.victory': '승리', 'duel.defeat': '패배', 'duel.finalScore': '최종 점수',
        'duel.fled': '적이 달아났다', 'duel.forfeit': '기권승',
        'duel.you': '나', 'duel.vs': 'VS', 'duel.foe': '적', 'duel.or': ' 또는 ',
        'duel.partyTag': '전투단 결투  ·  3판 2선승',
        'duel.partyText': '전투단과 함께이니 {names} 님과 겨루게 됩니다. 먼저 두 번 이기는 쪽이 상금을 차지합니다.',
        'duel.publicTag': '결투 재판  ·  3판 2선승',
        'duel.publicText': '다른 용병과 일대일로 맞서세요. 먼저 두 번 이기는 쪽이 상금을 차지합니다.',
        'duel.seek': '결투 찾기',
        'duel.seeking': '찾는 중', 'duel.awaitParty': '전투단을 기다리는 중', 'duel.awaitFoe': '걸맞은 적을 찾는 중',
        'duel.awaitPartyText': '{names} 님이 무기를 들면 바로 결투가 시작됩니다.',
        'duel.awaitFoeText': '버텨라. 다른 용병이 응하는 순간 결투가 시작된다.',
        'duel.withdraw': '물러나기',
        'duel.decided': '승부 결정', 'duel.nextRound': '{n}라운드 시작', 'duel.getReady': '준비하세요',
        'duel.roundWon': '라운드 승리', 'duel.roundLost': '라운드 패배', 'duel.roundDone': '{n}라운드 종료',
        'duel.purse': '금화 +{n}, 지갑에 넣었습니다.',
        'duel.purseGuest': '전당에서 로그인하면 금화를 벌고 전설에 이름을 올릴 수 있습니다.',
        'duel.rematch': '재대결', 'duel.another': '다른 상대 찾기',
        'duel.server': '대전 서버', 'duel.retry': '다시 시도',
        'duel.round': '{n}라운드', 'duel.fight': '싸워라!',
        'duel.deciding': '결승 라운드', 'duel.matchPoint': '매치 포인트', 'duel.bestOf3': '3판 2선승',
        'duel.lineTag': '승자 잔류',
        'duel.lineRule': '승자 잔류: 이긴 쪽은 다음 차례와 싸우고, 진 쪽은 줄 맨 뒤로 갑니다.',
        'duel.fightRow': '{round}라운드 · {a}–{b}',
        'duel.lineNext': '다음 차례입니다', 'duel.linePos': '대기 순서 {n}번째',
        'duel.holdField': '전장을 지켰습니다 · 곧 다음 상대가 나섭니다',
        'duel.toBack': '줄 맨 뒤로 갑니다 · 곧 다시 차례가 옵니다',

        // skirmish
        'sk.title': '접전', 'sk.tag': '2대2  ·  3판 2선승',
        'sk.soloText': '2대2 전투입니다. 다른 용병과 짝을 이뤄 두 적과 맞섭니다. 먼저 두 라운드를 이기는 쪽이 상금을 차지합니다.',
        'sk.partyText': '대장이 정한 편으로 전투단이 싸웁니다. 빈자리는 왕국의 용병들로 채워집니다.',
        'sk.gold': '황금 깃발', 'sk.crimson': '진홍 깃발', 'sk.open': '빈자리',
        'sk.seek': '접전 찾기',
        'sk.gathering': '집결 중', 'sk.gatherText': '전투단이 모이길 기다리는 중: {total}명 중 {arrived}명 도착.',
        'sk.seekTag': '부대를 모으는 중', 'sk.seekText': '전투에 나설 용병을 모으는 중: 4명 중 {found}명.',
        'sk.yourBand': '우리 편', 'sk.foes': '적', 'sk.down': '쓰러짐', 'sk.fled': '도망',
        'sk.spectate': '쓰러졌습니다  ·  {name} 관전 중', 'sk.downAlone': '쓰러졌습니다',
        'sk.felled': '{a} → {b} 처치', 'sk.left': '{name} 님이 전장을 떠났습니다',
        'sk.again': '다시 싸우기',

        // wardrobe
        'hdr.mercenary': "용병",
        'wd.title': "나의 용병",
        'wd.sub': "전장을 위한 차림",
        'wd.purseAfter': "닢이 있습니다. 외형은 전투력에 영향을 주지 않습니다.",
        'wd.tab.cloak': "망토",
        'wd.tab.helm': "투구",
        'wd.tab.trim': "장식·금속",
        'wd.tab.trail': "화살 궤적",
        'wd.tab.title': "칭호",
        'wd.worn': "착용 중",
        'wd.wear': "착용",
        'wd.free': "무료",
        'wd.buy': "구매 · 금화 {cost}",
        'wd.signIn': "용병을 꾸미려면 먼저 입단하세요.",
        'wd.cloak.umber': "암갈색",
        'wd.cloak.moss': "이끼색",
        'wd.cloak.slate': "청회색",
        'wd.cloak.wine': "포도주색",
        'wd.cloak.midnight': "한밤색",
        'wd.cloak.ash': "잿빛 흰색",
        'wd.cloak.blood': "핏빛",
        'wd.cloak.raven': "까마귀 검정",
        'wd.trim.brass': "황동",
        'wd.trim.iron': "쇠",
        'wd.trim.bronze': "청동",
        'wd.trim.silver': "은",
        'wd.trim.blackiron': "흑철",
        'wd.trim.gilded': "금도금",
        'wd.helm.sallet': "샐릿 투구",
        'wd.helm.hood': "두건",
        'wd.helm.great': "그레이트 헬름",
        'wd.helm.horned': "뿔 투구",
        'wd.helm.crowned': "왕관 투구",
        'wd.trail.none': "없음",
        'wd.trail.ember': "불씨",
        'wd.trail.frost': "서리",
        'wd.trail.venom': "독",
        'wd.trail.blood': "피",
        'wd.trail.shadow': "그림자",
        'title.none': "칭호 없음",
        'title.sellsword': "용병",
        'title.relentless': "불굴의 자",
        'title.butcher': "도살자",
        'title.slayer': "무리의 학살자",
        'title.survivor': "생존자",
        'title.warlordbane': "군벌의 재앙",
        'title.duelist': "결투가",
        'title.champion': "투기장의 챔피언",
        'title.brother': "전우",
        'title.warmaster': "전쟁군주",
        'rule.huntRuns': "사냥 {n}회 완료",
        'rule.totalKills': "사냥에서 적 {n}명 처치",
        'rule.bestWave': "사냥에서 {n}웨이브 도달",
        'rule.duelWins': "결투 {n}회 승리",
        'rule.skirmishWins': "접전 {n}회 승리",
        // the Prism event
        'event.title': '프리즘', 'event.daysLeft': '{n}일 남음', 'event.hoursLeft': '{n}시간 남음',
        'event.text': '사냥 중 드물게 무지개 화살이 발사됩니다. 그 화살로 적을 맞히면 한정판 프리즘 궤적을 얻습니다.',
        'event.owned': '프리즘 궤적을 가지고 있습니다. 용병 메뉴에서 착용하세요.',
        'wd.trail.prismatic': '프리즘', 'wd.limitedActive': '한정 · 사냥에서 획득', 'wd.limitedGone': '한정 · 더 이상 얻을 수 없음',
        'prism.stirs': '프리즘이 깨어난다!', 'prism.stirsSub': '무지개 화살로 적을 맞혀라',
        'prism.claiming': '명중!…',
        'prism.won': '프리즘 궤적 획득', 'prism.wonSub': '용병 메뉴에서 착용하세요',
        'prism.missed': '프리즘이 사라진다…', 'prism.missedSub': '다른 사냥에서 다시 나타날지도 모른다',
        'prism.failed': '프리즘을 얻지 못했습니다',
    },
};

// The server speaks English. Its messages are translated here by their text.
const SERVER_MESSAGES = {
    ko: {
        'No warband bears that seal': '그 인장을 가진 전투단이 없습니다',
        'That warband is full': '그 전투단은 가득 찼습니다',
        'Only the captain can choose the contract': '계약은 대장만 고를 수 있습니다',
        'Names are 3–16 letters, numbers or _': '이름은 영문, 숫자, _ 3–16자입니다',
        'Passwords are 6–72 characters': '비밀번호는 6–72자입니다',
        'That name is already sworn': '이미 누군가 맹세한 이름입니다',
        'Too many attempts. Wait a minute and try again': '시도가 너무 많습니다. 1분 뒤 다시 시도하세요',
        'That name and password do not match': '이름과 비밀번호가 일치하지 않습니다',
        'That cannot be forged any further': '더 이상 제련할 수 없습니다',
        'Not enough gold': '금화가 부족합니다',
        'The server stumbled. Try again': '서버에 문제가 생겼습니다. 다시 시도하세요',
        'Only the captain can choose the sides': '편은 대장만 정할 수 있습니다',
        'That side is full': '그 편은 가득 찼습니다',
        'That title is not yet earned': '아직 얻지 못한 칭호입니다',
        'You do not own that': '가지고 있지 않은 물건입니다',
    },
};

// Armory upgrades: names and descriptions by upgrade id, and the server's
// effect labels ("160 HP") rewritten by pattern.
const ARMORY_TEXT = {
    ko: {
        mail: ['단련된 사슬갑옷', '매 사냥을 더 높은 체력으로 시작합니다.'],
        quiver: ['깊은 화살통', '재장전 전까지 더 많은 화살을 쏩니다.'],
        bolts: ['미늘 화살', '모든 화살이 더 깊이 박힙니다.'],
        boots: ['날쌘 장화', '첫걸음부터 더 빠르게 움직입니다.'],
        satchel: ['화염병 주머니', '매 사냥을 더 많은 화염병으로 시작합니다.'],
        medic: ['야전 의무병', '웨이브를 막아낼 때마다 체력을 회복합니다.'],
    },
};
const LABEL_PATTERNS = {
    ko: [
        [/^(\d+) HP$/, '체력 $1'],
        [/^(\d+) BOLTS$/, '화살 $1발'],
        [/^\+(\d+)% DAMAGE$/, '피해 +$1%'],
        [/^SPEED (.+)$/, '속도 $1'],
        [/^(\d+) FIREPOTS$/, '화염병 $1개'],
        [/^HEAL (\d+)% \/ WAVE$/, '웨이브마다 $1% 회복'],
    ],
};

let LANG = (() => {
    try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved in LANGS)
            return saved;
    }
    catch { }
    return /^ko\b/i.test(navigator.language || '') ? 'ko' : 'en';
})();
document.documentElement.lang = LANG;

function tr(key, vars) {
    let s = STRINGS[LANG][key] ?? STRINGS.en[key] ?? key;
    if (vars)
        s = s.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
    return s;
}
function trServer(message) {
    return (SERVER_MESSAGES[LANG] && SERVER_MESSAGES[LANG][message]) || message;
}
function trUpgrade(upgrade) {
    const text = ARMORY_TEXT[LANG] && ARMORY_TEXT[LANG][upgrade.id];
    return text ? { name: text[0], desc: text[1] } : { name: upgrade.name, desc: upgrade.desc };
}
function trLabel(label) {
    for (const [re, out] of LABEL_PATTERNS[LANG] || [])
        if (re.test(label))
            return label.replace(re, out);
    return label;
}

function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = tr(el.dataset.i18nTitle); });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
}

// Switches language, then lets the page redraw anything it built in code.
function setLang(lang) {
    if (!(lang in LANGS) || lang === LANG)
        return;
    LANG = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { }
    applyI18n();
    window.dispatchEvent(new Event('langchange'));
}
