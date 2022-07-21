var mastervolume = 1;
var bVol = 0.7;
var fadeVol = 0.2;
var bFaded = false;
var background = new Howl({
  src: ['/sounds/ambient/background.mp3'],
  loop: true,
  volume: 0*mastervolume,
});
background.play();
var click = new Howl({
  src: ['/sounds/effects/key_click.mp3'],
  volume: 1*mastervolume
});

//effect
var bubbling = new Howl({
  src: ['/sounds/effects/bubbling.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var buzz = new Howl({
  src: ['/sounds/effects/buzz.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var croak = new Howl({
  src: ['/sounds/effects/croak.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var distant_hammers = new Howl({
  src: ['/sounds/effects/distant-hammers.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
})
var earth_rumble = new Howl({
  src: ['/sounds/effects/earth-rumble.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var frigid_air = new Howl({
  src: ['/sounds/effects/frigid-air.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var gentle_breeze = new Howl({
  src: ['/sounds/effects/gentle-breeze.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var mud = new Howl({
  src: ['/sounds/effects/mud.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var river = new Howl({
  src: ['/sounds/effects/river.mp3'],
  onend: function() {
    background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var sus_chord = new Howl({
  src: ['/sounds/effects/sus-chord.mp3'],
  onend: function() {
background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var wind = new Howl({
  src: ['/sounds/effects/wind.mp3'],
  onend: function() {
background.fade(fadeVol*mastervolume,bVol*mastervolume,1000);
    bFaded = false
  }
});
var sound_map = {
  'bubbling':bubbling,
  'buzz':buzz,
  'croak':croak,
  'distant-hammers':distant_hammers,
  'earth-rumble':earth_rumble,
  'frigid-air':frigid_air,
  'gentle-breeze':gentle_breeze,
  'mud':mud,
  'river':river,
  'sus-chord':sus_chord,
  'wind':wind
}


document.getElementById('text_in').focus();


document.addEventListener('keydown', (e) => {
  click.play();
  if (e.which == 13) {
    sendCommand(document.getElementById('text_in').value);
    document.getElementById('text_in').value = '';
  } else {
    if (document.getElementById('text_in').value.length == 0) {
      switch (e.which) {
        case 38:
          sendCommand('north');
          break;
        case 40:
          sendCommand('south');
          break;
        case 39:
          sendCommand('east');
          break;
        case 37:
          sendCommand('west');
      }
    }
  }
});
function json2array(json) {
  var result = [];
  var keys = Object.keys(json);
  keys.forEach(function(key) {
    var endJSON = json[key];
    endJSON.key = key
    result.push(endJSON);
  });
  return result;
}



const valid_commands = ['north', 'n', 'east', 'e', 'west', 'w', 'south', 's', 'take', 'grab', 'chat', 'talk', 'say', 'move', 'go', 'attack', 'fight', 'stats', 'flee','listings','bid','sell','list','buy'];
var sprite = {
  'Dragon': '/sprites/dragon.png',
  'Dwarf': '/sprites/dwarf.png',
  'Goblin': '/sprites/goblin.png',
  'Troll': '/sprites/troll.png'
}
const syn_comms = {
  'n': "north",
  'e': 'east',
  'w': 'west',
  's': 'south',
  'grab': 'take',
  'go': 'move',
  'fight': 'attack',
  'talk': 'chat',
  'say': 'chat',
  'sell':'list',
  'buy':'bid'
}
var player = undefined;
var toBe = undefined;
var currRoom = undefined;
var roomDate = undefined;
var stats = undefined;



function sendCommand(command) {
  spitText('>>' + command, 'white', ['bold'], 14);
  commandParts = [];
  command = command.split(" ");
  var identifier = command[0];
  identifier = identifier.toLowerCase();
  if (syn_comms[identifier]) {
    identifier = syn_comms[identifier];
  }
  command.shift();
  command = command.join(' ')
  if (identifier == 'join') {
    clear();
    background.fade(0*mastervolume,bVol*mastervolume,1000);
    toBe = command;
    if (!player) {
      socket.emit('join', command);
    } else {
      spitText('You are already joined', 'red');
    }
  } else if (identifier == "help") {
    help();
  } else if (valid_commands.indexOf(identifier) !== -1 && player) {
    socket.emit(identifier, { 'd': command, 'id': player });
  } else if (valid_commands.indexOf(identifier) !== -1 && !player) {
    spitText('Join the game using "join" + your name to start playing', 'red');
  } else {
    spitText('Not a valid option', 'red');
    spitText('Valid commands are ' + valid_commands.join(', '), 'red');
  }

}
function spitText(text, color = '#ccc', style, font_size = 12) {
  var newText = document.createElement('p')
  newText.appendChild(document.createTextNode(text))
  newText.style.color = color;
  newText.style.fontSize = font_size;
  if (style) {
    style.forEach((s) => {
      switch (s) {
        case 'italic':
          newText.style.fontStyle = "italic";
          break;
        case 'bold':
          newText.style.fontWeight = 'bold';
          break;
        case 'underline':
          newText.style.textDecoration = 'underline';
          break;
      }
    })
  }
  document.getElementById('text_out').appendChild(newText);
  var objDiv = document.getElementById("text_out");
  objDiv.scrollTop = objDiv.scrollHeight;
}
socket.on('color',(d)=>{
  spitText(d.d,d.color);
})
socket.on('battle_header',(d)=>{
  spitText(d,['#FE3B3B'],['bold'],18);
});
socket.on('battle',(d)=>{
  spitText(d,['#FE3B3B'],['bold','italic']);
})
socket.on('joined', (d) => {
  if (!player && toBe == d[0]) {
    player = d[1];
  }
  spitText(d[0] + ' has joined the game', 'cyan');
});
socket.on('direct_death', (d) => {
  spitText('YOU DIED', 'red', ['bold'], 20);
  spitText('Type "join" and your name to player again.');
  player = false;
  toBe = false;
  currRoom = false;
  roomDate = false;
  stats = false;
})
socket.on('out', (d) => {
  spitText(d);
});
socket.on('direct', (d) => {
  if (d.to == player) {
    spitText(d.d, 'orange');
  }
});
socket.on('room', (d) => {
  if (d.to == player) {
    if (d.d.id !== currRoom) {
      roomData = d.d;
      currRoom = d.d.id;
      //clear();
      spitText('You move into ' + roomData.name);
      var room = roomData;
      document.getElementById('room_name').innerHTML = room.name;
      document.getElementById('room_biome').innerHTML = room.biome[0].toUpperCase() + room.biome.substring(1);
      document.getElementById('room_des').innerHTML = room.des;
      var mobs = json2array(room.mobs);
      mobs = mobs.map((mob) => {
        return mob.display
      })
      var inRoom = [...json2array(room.players), ...mobs];
      updateIn(room);
      if (inRoom.length >= 5) {
        inRoom.splice(5, inRoom.length - 6);
        inRoom[5] = inRoom[5] + '...';
      }
      if (inRoom.length >= 0) {
        spitText("In this room: " + inRoom.join(', '), 'pink', ['bold'])
      }
      spitText(room.des);
      var moveOps = Object.keys(room.joins);
      moveOps.forEach((opt) => {
        spitText('A path leads to the ' + opt, 'gold', ['italic']);
      });
      updateRoomMenu();

    } else {
      spitText('You can not go there', 'red', ['bold']);
    }
  }

});
socket.on('splash', (d) => {
  spitText(d, '#fff', ['italic'])
})
socket.on('updateIn', (ins) => {
  updateIn(ins);
});
socket.on('out_attack', (d) => {
  spitText(d, '#8d0000', ['bold', 'underline']);
});
socket.on('sound',(d)=>{
  playSplashSound(d);
});
socket.on('listings',(list)=>{
  list.forEach(l=>{
    spitText(l,'#90EE90',['italic']);
  })
})
socket.on('stats', (d) => {
  if (d.to == player) {
    stats = d.stats;
    document.getElementById('prog-health').style.width = (stats.health / stats.cap) * 100 + '%';
    document.getElementById('prog-health').innerHTML = stats.health + '/' + stats.cap
    document.getElementById('prog-stamina').style.width = (stats.stamina / stats.cap) * 100 + '%';
    document.getElementById('prog-stamina').innerHTML = stats.stamina + '/' + stats.cap;
    document.querySelectorAll('.player_cap').forEach((elem) => {
      elem.innerHTML = stats.cap;
    });
    if(player_menu.isOpen){
      updatePlayerMenu();
    }
  }
})


spitText('Welcome', 'white', ['bold'], 25);
help();



function help() {
  spitText('How to play', '#ccc', ['italic'], 16);
  spitText('<UPDATE> Arrow keys work to move around the map <UPDATE>', 'gold', ['bold', 'italic'], 13)
  spitText('1. Type "join <name>" into the command box at the bottom of the screen. (replace <name> with your name');
  spitText('2. Use "move <direction>" or just "<direction>" to travel between rooms.');
  spitText('3. "take <item>" or "grab <item>" to pick up items and add them to your inventory');
  spitText('4. "use <item>" to use an item in your inventory.');
  spitText('5. "equip <item>" to equip weapons and armor');
  spitText('6. "chat <text>", "say <text>" or "talk <text>" to say something to other players in a room');
  spitText('7. "fight <name>" or "attack <name>" to duel another character');
  spitText('8. "help" to bring up this again');
}
function clear() {
  document.getElementById('text_out').innerHTML = '';
}
function updatePlayerMenu() {
  document.getElementById('prog-health').style.width = (stats.health / stats.cap) * 100 + '%';
  document.getElementById('prog-health').innerHTML = stats.health + '/' + stats.cap
  document.getElementById('prog-stamina').style.width = (stats.stamina / stats.cap) * 100 + '%';
  document.getElementById('prog-stamina').innerHTML = stats.stamina + '/' + stats.cap;
  document.querySelectorAll('.player_cap').forEach((elem) => {
    elem.innerHTML = stats.cap;
  });
  document.getElementById('player_name').innerHTML = stats.name;
  document.getElementById('player_level').innerHTML = stats.level;
  document.getElementById('player_kills').innerHTML = stats.kills;
  document.getElementById('player_health').innerHTML = stats.health;
  document.getElementById('player_dex').innerHTML = stats.dex;
  document.getElementById('player_strength').innerHTML = stats.strength;
  document.getElementById('player_stamina').innerHTML = stats.stamina;
  document.getElementById('player_inv').innerHTML = stats.inv.join(', ') 
  document.getElementById('player_gold').innerHTML = stats.gold
}
function updateIn(ins) {
  var mobs = json2array(ins.mobs);
  mobs = mobs.map((mob) => {
    var type = mob.name;
    return mob.display + '<img src = "' + sprite[type] + '" width = "18" height = "18">';
  })
  var inRoom = [...json2array(ins.players), ...mobs];
  var ul = document.createElement('ul');
  inRoom.forEach((dude) => {
    var li = document.createElement('li');
    li.innerHTML = dude;
    ul.appendChild(li);
  });
  document.getElementById('in_room').innerHTML = '';
  document.getElementById('in_room').appendChild(ul)
  return inRoom;
}
function updateRoomMenu() {
  var room = roomData;
  document.getElementById('room_name').innerHTML = room.name;
  document.getElementById('room_biome').innerHTML = room.biome[0].toUpperCase() + room.biome.substring(1);
  document.getElementById('room_des').innerHTML = room.des;
  updateIn(room);
}
class Menu {
  constructor(html) {
    this.html = html;
    this.isOpon = false;
  }
  open() {
    this.isOpen = true;
    document.getElementById('menu_out').innerHTML = this.html;
  }
  close() {
    this.isOpen = false
  }
}
var room_menu = new Menu(`<h1 id = "room_name">Join the game</h1>
        <h3><span id = "room_biome">Space</span> biome</h3>
        <p id = "room_des">Floating in the abyss</p>
        <hr>
        <h3>In this room</h3>
        <div id = "in_room">
          <ul>
            <li>A whole lot o' nothin</li>
          </ul>
        </div>`);
room_menu.open();
var player_menu = new Menu(`<h1 id = "player_name">Fred the big bad boy</h1>
<p>$<span id = "player_gold">0</span></p>
        <h3>Level <span id = "player_level">12</span></h3>
        <p><span id = "player_kills">2</span> kills</p>
        <hr>
<h4>Inventory</h4>
<p id = "player_inv"></p>
        <h3>Stats</h3>
        <div id = "player_stats">
          <ul>
            <li>Health <span id ="player_health">75</span>/<span class = "player_cap">100</span></li>
            <li>Dexterity <span id ="player_dex">1</span>/<span class = "player_cap">100</span></li>
            <li>Strength <span id ="player_strength">1</span>/<span class = "player_cap">100</span></li>
            <li>Sight <span id ="player_sight">20</span>/<span class = "player_cap">100</span></li>
            <li>Stamina <span id ="player_stamina">80</span>/<span class = "player_cap">100</span></li>
          </ul>
        </div>`);
document.getElementById('settings').onclick = ()=>{
  var volume = prompt('Set the master volume [0-100]',mastervolume*100);
  mastervolume = volume/100;
  background.volume(bVol * mastervolume)
  click.volume(mastervolume);
}
document.getElementById('room_data').onclick = () => {
  room_menu.open();
  player_menu.close()
  document.querySelectorAll('.active')[0].classList.remove('active');
  document.getElementById('room_data').classList.add('active');
  updateRoomMenu()
}
document.getElementById('player_data').onclick = () => {
  document.querySelectorAll('.active')[0].classList.remove('active');
  document.getElementById('player_data').classList.add('active');
  player_menu.open();
  room_menu.close()
  updatePlayerMenu();
}
function playClick(){
  var ad = document.createElement('audio');
  ad.src = '/key_click.mp3';
  ad.controls = 'true';
  ad.innerHTML = "Your browser does not support the <audio> element";
  ad.addEventListener('ended',()=>{
    ad.remove();
  })
  document.body.appendChild(ad);
  ad.play();
}
function playSplashSound(fName){
  if(fName){
      background.fade(bVol*mastervolume,fadeVol*mastervolume,1000);
    sound_map[fName].volume(0*mastervolume);
    sound_map[fName].play();
    sound_map[fName].fade(0*mastervolume,1*mastervolume,1000);
  }
}
