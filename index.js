const express = require('express');
const { Server } = require("socket.io");
const xss = require('xss');

const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });



var roomsObj = {};
var playerObj = {};
var mobObj = {};


//Helpers
function uuid() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
function UUID() {
  return (uuid() + uuid() + "-" + uuid() + "-3" + uuid().substr(0, 2) + "-" + uuid() + "-" + uuid() + uuid() + uuid()).toLowerCase()
}
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}
function choice(events, size, probability) {
  if (probability != null) {
    const pSum = probability.reduce((sum, v) => sum + v);
    if (pSum < 1 - Number.EPSILON || pSum > 1 + Number.EPSILON) {
      throw Error("Overall probability has to be 1.");
    }
    if (probability.find((p) => p < 0) != undefined) {
      throw Error("Probability can not contain negative values");
    }
    if (events.length != probability.length) {
      throw Error("Events have to be same length as probability");
    }
  } else {
    probability = new Array(events.length).fill(1 / events.length);
  }

  var probabilityRanges = probability.reduce((ranges, v, i) => {
    var start = i > 0 ? ranges[i - 1][1] : 0 - Number.EPSILON;
    ranges.push([start, v + start + Number.EPSILON]);
    return ranges;
  }, []);

  var choices = new Array();
  for (var i = 0; i < size; i++) {
    var random = Math.random();
    var rangeIndex = probabilityRanges.findIndex((v, i) => random > v[0] && random <= v[1]);
    choices.push(events[rangeIndex]);
  }
  return choices;
}
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
function search(key, room) {
  var players = json2array(playerObj, room);
  players = players.filter((player) => {
    if (player.name == key && player.currRoom.id == room) {
      return true;
    } else {
      return false;
    }
  });
  var mobs = json2array(mobObj);
  mobs = mobs.map((mob) => {
    mob.likely = 0;
    key = key.toLowerCase()
    if (mob.roomID == room) {
      if (mob.fName.toLowerCase() == key) {
        mob.likely++;
      }
      if (mob.lName.toLowerCase() == key) {
        mob.likely++;
      };
      if (mob.fullName.toLowerCase() == key) {
        mob.likely += 4;
      }
    } else {
      mob.likely = -1;
    }
    return mob;
  });
  mobs = mobs.sort((a, b) => {
    if (a.likely < b.likely) {
      return 1;
    } else if (a.likely > b.likely) {
      return -1;
    } else {
      return 0;
    }
  });
  if (mobs.length > 0) {
    if (mobs[0].likely >= 1) {
      return mobs[0];
    } else if (players[0]) {
      return players[0]
    } else {
      return false;
    }
  }
}
//end helpers

var names = ["Jerry", "Thomas", "Dean", "Benjamin", "Nicholas", "Matthew", "Arnold", "Bobette", "Susy", "Alexander", "Frederick", "Beatrice", "Estelle", "Addison", "Connor", "Eugenie", "George", "Sally", "Jocelyn", "Joshua", "Nathaniel", "Jack", "Adam", "Parker", "Stewart", "Reed", "Howard"];
var lnames = ["Dean", "Thomas", "Mason", "Baker", "Cook", "Smith", "Williams", "Brown", "Wilson", "Fredson", "Georgeson", "Jackson", "Harris", "Walker", "King", "Hill", "Adams", "Morris"]




class Shop {
  constructor(key = 'shop') {
    this.items = [];
  }
  addItem(item, cost) {
    var id = 'item_' + UUID();
    this.items.push({
      'item': item,
      'cost': cost,
      'uuid': id
    });
    return id
  }
  removeItem(id) {
    var removedItem;
    this.items.forEach((item, i) => {
      if (item.id == id) {
        removedItem = item;
        this.items.splice(i, 1);
      }
    })
    return removedItem;
  }
  sort(highFirst) {
    this.items.sort((a, b) => {
      if (a.cost < b.cost) {
        return (highFirst) ? -1 : 1;
      } else if (a.cost > b.cost) {
        return (highFirst) ? 1 : -1;
      }
      return 0;
    })
  }
}
class Mob {
  constructor(name = 'Spyder', health = 20, dex = 100, strength = 15,defense,hostility, roomID) {
    this.dropsOps = [{ name: 'gold', odds: 0.7 },
    { name: 'cinnamon', odds: 0.06 },
    { name: 'nutmeg', odds: 0.05 },
    { name: 'paprika', odds: 0.041 },
    { name: 'cumin', odds: 0.033 },
    { name: 'clove', odds: 0.031 },
    { name: 'ginger', odds: 0.028 },
    { name: 'saffron', odds: 0.027 },
    { name: 'sesame', odds: 0.02 },
    { name: 'vanilla', odds: 0.01 }
    ];
    this.inv = this.getDrops();
    this.xp = 0;
    this.hostility = hostility;
    this.name = name;
    this.attackedBy = [];
    this.fName = names[Math.floor(Math.random() * names.length)];
    this.lName = lnames[Math.floor(Math.random() * lnames.length)]
    this.fullName = this.fName + ' ' + this.lName;
    this.display = this.fullName + ' [' + this.name + ']'
    this.health = health;
    this.dexterity = dex;
    this.strength = strength;
    this.defense = defense
    this.cap = 100;
    this.uuid = 'mob_' + UUID()
    this.currRoom = {};
    this.roomID = roomID;
    this.currRoom.joins = roomsObj[roomID].joins;
  }
  enterRoomMonitor(dude){
    if(dude.name !== this.name && (Math.floor(Math.random() * 100) <= this.hostility)){
      var attack = new Battle(this, dude,this.roomID);
    }
  }
  //@param battle
  //--obj Battle
  battleMonitor(battle){
    var sInvolved = this.isSpeciesConflict(battle.involved)
    if((Math.floor(Math.random() * 100) <= this.hostility) || sInvolved){
      battle.join(this,sInvolved);
    }
  }
  isSpeciesConflict(involved){
    var prospectiveTargets = involved.filter((i)=>{
      return (i.name !== this.name)
    });
    var isInvolved = involved.filter((i)=>{
      return (i.name == this.name)
    })
    if(isInvolved.length >= 1){
      if(prospectiveTargets[0]){
        return prospectiveTargets[0]
      }
    }
    return false;
  }
  tick() {
    if (this.attackedBy.length == 0) {
      var directions = ['north', 'south', 'east', 'west'];
      var i = Math.floor(Math.random() * directions.length)
      var direction = directions[i]
      this.move(direction);
    }
  }
  move(direction) {
    if (this.currRoom.joins[direction]) {
      if (roomsObj[this.currRoom.joins[direction]].enterable) {
        roomsObj[this.roomID].mobLeave(this.uuid);
        this.roomID = roomsObj[this.currRoom.joins[direction]].id
        this.currRoom.joins = roomsObj[this.currRoom.joins[direction]].joins;
        roomsObj[this.roomID].mobEnter(this.uuid)
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  getDrops() {
    return choice(['gold', 'cinnamon', 'nutmeg', 'paprika', 'cumin', 'clove', 'ginger', 'saffron', 'sesame', 'vanilla'], 3, [0.7, 0.06, 0.05, 0.041, 0.033, 0.031, 0.028, 0.027, 0.02, 0.01]);
  }
  attack() {
    /*
2: high
1: mid
0: low
*/
    return Math.floor(Math.random() * 3);
  }
  defend() {
    return Math.floor(Math.random() * 3);
  }
  getDamage() {
    return Math.floor(Math.random() * this.strength) + Math.floor(Math.random() * 0.5 * this.dexterity);
  }
  takeDamage(d) {
    this.health -= d;
    if (this.health <= 0) {
      roomsObj[this.roomID].killMob(this.uuid);
      return 0
    } else {
      return this.health;
    }
  }
}


/*
@param mob
-name string
-health int
-dex in
-strenth int
-defense int
-hostility int (percentage 0-100)
*/
function spawnDwarf(room) {
  return new Mob('Dwarf', getRandomIntInclusive(70,100), getRandomIntInclusive(20,40), getRandomIntInclusive(50,80),getRandomIntInclusive(0,100),getRandomIntInclusive(0,50), room);
}
function spawnDragon(room) {
  return new Mob('Dragon', getRandomIntInclusive(80,150), getRandomIntInclusive(70,100), getRandomIntInclusive(70,150),getRandomIntInclusive(0,100),getRandomIntInclusive(80,100), room);
}
function spawnTroll(room) {
  return new Mob('Troll', getRandomIntInclusive(80,160), getRandomIntInclusive(1,40), getRandomIntInclusive(60,100),getRandomIntInclusive(0,100),getRandomIntInclusive(25,80), room)
}
function spawnGoblin(room) {
  return new Mob('Goblin', getRandomIntInclusive(25,100), getRandomIntInclusive(90,120), getRandomIntInclusive(20,75),getRandomIntInclusive(0,100),getRandomIntInclusive(50,90), room);
}



class Player {
  constructor(name) {
    this.name = name;
    this.display = name;
    this.inv = [];
    this.currRoom = '';
    this.attackedBy = [];
    this.armor = {
      'helmet': false,
      'chestplate': false,
      'leggings': false,
      'boots': false
    }
    this.weapon = false;
    this.strength = Math.floor(Math.random() * 100);
    this.dexterity = Math.floor(Math.random() * 100);
    this.health = Math.floor(Math.random() * 100);
    this.sight = Math.floor(Math.random() * 100);
    this.resistance = Math.floor(Math.random() * 100);
    this.stamina = 100;
    this.cap = 100;
    this.level = 1;
    this.xp = 0;
    this.kills = 0;
    this.gold = 0;
  }
  takeItem(item) {
    this.inv.push(item);
  }
  getStats() {
    return {
      strength: this.strength,
      health: this.health,
      sight: this.sight,
      dex: this.dexterity,
      weapon: this.weapon,
      armor: this.armor,
      attackedBy: this.attackedBy,
      stamina: this.stamina,
      cap: this.cap,
      level: this.level,
      xp: this.xp,
      kills: this.kills,
      name: this.name,
      inv: this.inv,
      gold: this.gold
    }
  }
  takeDamage(d) {
    this.health -= d;
    if (this.health <= 0) {
      roomsObj[this.currRoom.id].killPlayer(this.uuid);
      return 0
    } else {
      io.to(this.id).emit('stats', { to: this.id, stats: this.getStats() });
      return this.health;
    }
  }
  equipItem(item) {
    if (this.inv.indexOf(item) !== -1) {
      if (this.weapon) {
        if (this.weapon == item) {
          io.to(this.id).emit('direct', { 'd': item.name + ' is already equipped', 'to': this.id })
        } else {
          this.weapon = item;
          io.to(this.id).emit('direct', { 'd': item.name + ' equiped', 'to': this.id });
          io.to(this.id).emit('stats', { to: this.id, stats: this.getStats() });
        }
      }
    } else {
      io.to(this.id).emit('direct', { 'd': 'Item not in inventory', 'to': this.id });
    }
  }
  getDamage() {
    return Math.floor(Math.random() * this.strength) + Math.floor(Math.random() * 0.5 * this.dexterity);
  }
  useItem(item) {
    if (this.inv.indexOf(item) !== -1) {
      this.inv.forEach((item, i) => {
        this.inv.splice(i, 1);
        item.use(this);
        io.to(this.id).emit('stats', { to: this.id, stats: this.getStats() });
      })
    } else {
      io.to(this.id).emit('direct', { 'd': 'Item not in inventory', 'to': this.id });
    }
  }
  move(direction) {
    if (this.stamina > 0) {
      if (this.currRoom.joins[direction]) {
        if (roomsObj[this.currRoom.joins[direction]].enterable) {
          this.currRoom.leave(this.id, this.name);
          this.currRoom = roomsObj[this.currRoom.joins[direction]];
          this.currRoom.enter(this.id, this.name);
          this.stamina -= 2;
          io.to(this.id).emit('stats', { to: this.id, stats: this.getStats() });
          io.to(this.id).emit('room', { d: this.currRoom, to: this.id });
          return true;
        } else {
          io.to(this.id).emit('direct', { d: 'That direction is too dangerous to pass through', to: this.id });
        }
      } else {
        io.to(this.id).emit('direct', { d: 'No paths lead that direction', to: this.id })
      }

    } else {
      io.to(this.id).emit('direct', { to: this.id, d: 'You are too tired to go that way' });
    }
    return false;
  }
}
class Item {
  constructor(use) {
    this.use = use;
  }
}
class Room {
  constructor(name, des, biome, joins, spawnRate, enterable, id) {
    this.name = name;
    this.enterable = enterable;
    this.des = des;
    this.biome = biome;
    this.joins = joins;
    this.mobs = {};
    this.players = {};
    this.id = id;
    this.uuid = 'room_' + UUID();
    this.biomeSplash = {
      "plains": [
        {sp:"A cool wind blows and stirs the grass",
           so:'wind'}, 
        {sp:"A slight breeze blows from the mountains",
           so:'gentle-breeze'},
        {sp:"You smell the flowers",
           so: false}
      ],
      'river': [
        {sp:"The cool water rushes around your feet",
           'so':'river'},
        {sp:"Your feet are quite numb",
           so:false}
      ],
      "mountains": [
        {sp:"The frigid air bites into your skin",  
           so:'frigid-air'},
        {sp:"The distant din of hammers from dwarves echoes around you",
           so:'distant-hammers'}, 
        {sp:"A light snow begins to fall",
           so:false}
      ],
      "volcanoe": [
        {sp:"The earth rumbles",
           so:'earth-rumble'}, 
        {sp:'Lava bubbles',
           so:"bubbling"},
        {sp:"You feel hot and thirsty",
           so:false},
        {sp:"Hot air swirls around you",
           so:'gentle-breeze.mp3'}, 
        {sp:"A sense of danger permeates you",
           so:"sus-chord"}
      ],
      "swamp": [
        {sp:"Mosquitos buzz",
           so:'buzz'}, 
        {sp:"A toad croaks",
           so:'croak'}, 
        {sp:"You feel hot and sticky",
           so:false}, 
        {sp:"Your feet are heavy with mud",
           so:'mud'}
      ],
      "wasteland": [
        {sp:".... creak ...",
           so:'creak'}, 
        {sp:"     Emptiness",
           so:false},
        {sp: "You feel drained",
           so:false}, 
        {sp:"You are very tired",
           so:false}
      ]
    };
    this.biomeSpawn = {
      "mountains": spawnDwarf,
      "volcanoe": spawnDragon,
      "swamp": spawnTroll,
      "wasteland": spawnGoblin
    }
    this.mobSpawnRate = spawnRate;


    this.splash();
  }
  enter(id, playerName) {
    io.to(this.name).emit('out', playerName + ' has entered');

    this.players[id] = playerName;
    var mobsArray = json2array(this.mobs);
    mobsArray.forEach((mob)=>{
      mobObj[mob.key].enterRoomMonitor(playerObj[id]);
    })
    io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players })
  }
  leave(id, name) {
    io.to(this.name).emit('out', name + ' leaves ' + this.name);
    delete this.players[id];
    io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players })
  }
  killPlayer(player) {
    io.to(this.name).emit('direct_death', player);
    io.to(this.name).emit('out', playerObj[player].name + ' has died.');
    delete this.players[player];
    delete playerObj[player];
  }
  killMob(mob) {
    io.to(this.name).emit('out', mobObj[mob].display + ' has died')
    delete this.mobs[mob];
    delete mobObj[mob];
    io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players })
  }
  mobEnter(mob) {
    io.to(this.name).emit('out', mobObj[mob].display + ' has entered');
    this.mobs[mob] = { 'display': mobObj[mob].display, 'name': mobObj[mob].name };
    io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players })
  }
  mobLeave(mob) {
    io.to(this.name).emit('out', mobObj[mob].display + ' has left');
    delete this.mobs[mob];
    io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players })
  }
  tick() {
    if (Math.floor(Math.random() * 100) < this.mobSpawnRate) {
      if (this.biomeSpawn[this.biome]) {
        var spawnedMob = this.biomeSpawn[this.biome](this.id);
        this.mobs[spawnedMob.uuid] = { 'display': spawnedMob.display, 'name': spawnedMob.name };
        mobObj[spawnedMob.uuid] = spawnedMob;
        io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players });
        io.to(this.name).emit('out', 'A ' + mobObj[spawnedMob.uuid].name + ' has spawned here')
      }
    }
  }
  splash() {
    var sID = Math.floor(Math.random() * this.biomeSplash[this.biome].length)
    io.to(this.name).emit('splash', this.biomeSplash[this.biome][sID].sp);
    io.to(this.name).emit('sound',this.biomeSplash[this.biome][sID].so);
    setTimeout(()=>{
      this.splash()
    },getRandomIntInclusive(10000,30000))
    
  }
}
class Market extends Room{
  constructor(...args){
    super(...args);
    this.listings = [];
  }
  enter(id,name){
    io.to(this.name).emit('out', name + ' has entered');

    this.players[id] = name;
    io.to(this.name).emit('updateIn', { mobs: this.mobs, players: this.players })
    io.to(id).emit('color',{d: '======+INSTRUCTIONS+======','color':'#fff'});
    io.to(id).emit('color',{d:'Use "listings" to see what is for sale.',color:'white'})
    io.to(id).emit('color',{d:'"sell <item> <cost>" or "list <item> <cost>" to sell an item (replace <item> with the item and <cost> with the starting bid)',color: 'white'})
    io.to(id).emit('color',{d:'"bid <number> <cost>" or "buy <number> <cost>" to put a bid on an item. (Replace <number> with the number of the item in the listings, and <cost> with your bid. If no one beats your bid in 2 minutes, the item is sold.',color: 'white'})
  }
}
class Battle {
  /*
@param attacker 
--obj Mob | Player
@param attacked
--obj Mob | Player
@param room
--string UUID
*/
  constructor(attacker, attacked, room) {
    attacker.target = attacked.uuid;
    attacker.attackedBy.push(attacked.uuid);
    attacker.targetType = attacked.type;
    attacked.target = attacker.uuid;
    attacked.attackedBy.push(attacker.uuid);
    attacked.targetType = attacker.type
    this.room = room;
    this.involved = [attacker, attacked];
    this.turn();
  }
  turn() {
    io.to(roomsObj[this.room].name).emit('battle_header', '=========+BATTLE LOGS+=========')
    this.involved.forEach((dude, i) => {
      var damage_dealt = dude.getDamage();
      if (dude.targetType == 'Mob') {

        if (mobObj[dude.target] && dude && dude.health > 0 && mobObj[dude.target].health > 0) {
          
          var overDamage = damage_dealt * (mobObj[dude.target].defense/mobObj[dude.target].cap);
          var absorbed = damage_dealt-overDamage;
          // valid


          //
          var dodge = (mobObj[dude.target].dexterity/mobObj[dude.target].cap)/3;
          if(Math.floor(Math.random() * 100) < dodge){
            io.to(roomsObj[this.room].name).emit('battle',mobObj[dude.target].display+ ' dodges a blow and takes no damage')
          }else{

            if (mobObj[dude.target].health - overDamage <= 0) {
              io.to(roomsObj[this.room].name).emit('battle', dude.display + ' deals ' + damage_dealt + ' damage to ' + mobObj[dude.target].display);
              io.to(roomsObj[this.room].name).emit('battle',mobObj[dude.target].display+"'s defense of "+mobObj[dude.target].defense+" absorbs "+ absorbed+" damage, for an overall of -"+overDamage )
              io.to(roomsObj[this.room].name).emit('battle', dude.display + ' has killed ' + mobObj[dude.target].display)
              var drops = mobObj[dude.target].getDrops();
              drops.forEach((drop) => {
                if (drop == 'gold') {
                  dude.gold += 5;
                } else {
                  dude.inv.push(drop);
                }
                dude.kills++;
                dude.xp += Math.round(0.5 * mobObj[dude.target].xp + 20);
              });
  
              mobObj[dude.target].takeDamage(overDamage);
              dude.attackedBy.forEach((uid, i) => {
                if (uid == dude.target) {
                  dude.attackedBy.splice(i, 1);
                }
              })
              if (dude.attackedBy.length >= 1) {
                dude.target = dude.attackedBy[0];
              } else {
                dude.attacking = false;
                dude.target = false;
                dude.targetType = false
                this.involved.splice(i, 1);
              }
            } else {
              mobObj[dude.target].takeDamage(overDamage);
              io.to(roomsObj[this.room].name).emit('battle', dude.display + ' deals ' + damage_dealt + ' damage to ' + mobObj[dude.target].display);
              io.to(roomsObj[this.room].name).emit('battle',mobObj[dude.target].display+"'s defense of "+mobObj[dude.target].defense+" absorbs "+ absorbed+" damage, for an overall of -"+overDamage + ', leaving ' + mobObj[dude.target].display + ' with ' + mobObj[dude.target].health + ' health points')
            }
          }
        }
      } else {
        if (playerObj[dude.target] && dude && dude.health > 0 && playerObj[dude.target].health > 0) {

          
          var overDamage = damage_dealt * (playerObj[dude.target].defense/playerObj[dude.target].cap);
          var absorbed = damage_dealt-overDamage;


          
          var dodge = (playerObj[dude.target].dexterity/playerObj[dude.target].cap)/3;
          if(Math.floor(Math.random() * 100) >= dodge){
            if (playerObj[dude.target].health - overDamage <= 0) {
              io.to(roomsObj[this.room].name).emit('battle', dude.display + ' deals ' + damage_dealt + ' damage to ' + playerObj[dude.target].display);
              io.to(roomsObj[this.room].name).emit('battle',playerObj[dude.target].display+"'s defense of "+playerObj[dude.target].defense+" absorbs "+ absorbed+" damage, for an overall of -"+overDamage )
              io.to(roomsObj[this.room].name).emit('battle', dude.display + ' has killed ' + playerObj[dude.target].display)
              playerObj[dude.target].inv.forEach((drop) => {
                if (drop == 'gold') {
                  dude.gold += 5;
                } else {
                  dude.inv.push(drop);
                }
                dude.xp += Math.round(0.5 * playerObj[dude.target].xp + 20);
                dude.kills++;
                dude.gold += playerObj[dude.target].gold;
              });
  
              playerObj[dude.target].takeDamage(overDamage);
              dude.attackedBy.forEach((uid, i) => {
                if (uid == dude.target) {
                  dude.attackedBy.splice(i, 1);
                }
              })
              if (dude.attackedBy.length >= 1) {
                dude.target = dude.attackedBy[0];
              } else {
                dude.attacking = false;
                dude.target = false;
                dude.targetType = false
                this.involved.splice(i, 1);
              }
            } else {
              playerObj[dude.target].takeDamage(overDamage);
              io.to(roomsObj[this.room].name).emit('battle', dude.display + ' deals ' + damage_dealt + ' damage to ' + playerObj[dude.target].display);
              io.to(roomsObj[this.room].name).emit('battle',playerObj[dude.target].display+"'s defense of "+playerObj[dude.target].defense+" absorbs "+ absorbed+" damage, for an overall of -"+overDamage + ', leaving ' + playerObj[dude.target].display + ' with ' + playerObj[dude.target].health + ' health points')
            }
  
          }else{
            io.to(roomsObj[this.room].name).emit('battle',playerObj[dude.target].display + ' dodges a blow and takes no damage');
          }
        }
      }
    });
    if(this.involved.length > 1){
      io.to(roomsObj[this.room].name).emit('battle', 'The fighters rally for another round. (A good time to flee is now)');
    }else{
      io.to(roomsObj[this.room].name).emit('battle','The fight ends');
    }
    io.to(roomsObj[this.room].name).emit('battle', '=====================================================')
    if (this.involved.length > 1) {
      setTimeout(function() {
        this.turn();
      }.bind(this), 5000);
    } else {
      io.to(roomsObj[this.room].name).emit('out', 'The fight ends');
    }
  }
  join(attacker, attacked) {
    attacker.target = attacked.uuid;
    attacker.attackedBy.push(attacked.uuid);
    attacked.target = attacker.uuid;
    attacked.attackedBy.push(attacker.uuid);
    this.involved.push(attacked);
    this.involved.push(attacker);
    io.to(roomsObj[this.room].name).emit('out', attacker.display + ' has joined the battle');
  }
}

//connection
io.on('connection', (socket) => {
  console.log('connection');


  //join
  socket.on('join', (d) => {
    if (d) {
      var spawn = p1
      var player = new Player(d);
      player.id = 'player_' + UUID();
      player.uuid = player.id;
      playerObj[player.id] = player;
      io.emit('joined', [player.name, player.id]);
      playerObj[player.id].currRoom = spawn;
      socket.join(spawn.name);
      socket.join(player.id);
      recharge(player.id); io.to(player.id).emit('room', { 'd': playerObj[player.id].currRoom, 'to': player.id });
    }
  });


  //directions
  socket.on('north', (d) => {
    if (!playerObj[d.id].attacking) {
      if (roomsObj[playerObj[d.id].currRoom.joins['north']]) {
        socket.leave(playerObj[d.id].currRoom.name);
        socket.join(roomsObj[playerObj[d.id].currRoom.joins['north']].name);
        playerObj[d.id].move('north');
        socket.join(playerObj[d.id].currRoom.name);
      }
    } else {
      io.to(d.id).emit('direct', { 'd': 'You are in the middle of battle. (Use "flee <direction>" and replace <direction> with one of the compass points to try and escape)', 'to': d.id });
    }


  });
  socket.on('south', (d) => {
    if (!playerObj[d.id].attacking) {
      if (roomsObj[playerObj[d.id].currRoom.joins['south']]) {
        socket.leave(playerObj[d.id].currRoom.name);
        socket.join(roomsObj[playerObj[d.id].currRoom.joins['south']].name);
        playerObj[d.id].move('south');
        socket.join(playerObj[d.id].currRoom.name);
      }
    } else {
      io.to(d.id).emit('direct', { 'd': 'You are in the middle of battle. (Use "flee <direction>" and replace <direction> with one of the compass points to try and escape)', 'to': d.id });
    }
  });
  socket.on('west', (d) => {
    if (!playerObj[d.id].attacking) {
      if (roomsObj[playerObj[d.id].currRoom.joins['west']]) {
        socket.leave(playerObj[d.id].currRoom.name);
        socket.join(roomsObj[playerObj[d.id].currRoom.joins['west']].name);
        playerObj[d.id].move('west');
        socket.join(playerObj[d.id].currRoom.name);
      }
    } else {
      io.to(d.id).emit('direct', { 'd': 'You are in the middle of battle. (Use "flee <direction>" and replace <direction> with one of the compass points to try and escape)', 'to': d.id });
    }
  });
  socket.on('east', (d) => {
    if (!playerObj[d.id].attacking) {
      if (roomsObj[playerObj[d.id].currRoom.joins['east']]) {
        socket.leave(playerObj[d.id].currRoom.name);
        socket.join(roomsObj[playerObj[d.id].currRoom.joins['east']].name);
        playerObj[d.id].move('east');
        socket.join(playerObj[d.id].currRoom.name);
      }
    } else {
      io.to(d.id).emit('direct', { 'd': 'You are in the middle of battle. (Use "flee <direction>" and replace <direction> with one of the compass points to try and escape)', 'to': d.id });
    }
  });
  socket.on('move', (d) => {
    if (!playerObj[d.id].attacking) {
      if (roomsObj[playerObj[d.id].currRoom.joins[d.d]]) {
        socket.leave(playerObj[d.id].currRoom.name);
        socket.join(roomsObj[playerObj[d.id].currRoom.joins[d.d]].name);
        playerObj[d.id].move(d.d);
        socket.join(playerObj[d.id].currRoom.name);
      }
    } else {
      io.to(d.id).emit('direct', { 'd': 'You are in the middle of battle. (Use "flee <direction>" and replace <direction> with one of the compass points to try and escape)', 'to': d.id });
    }
  });


  //chat
  socket.on('chat', (d) => {
    io.to(playerObj[d.id].currRoom.name).emit('out', xss(playerObj[d.id].name + ' says: ' + d.d));
  });

  socket.on('flee', (d) => {
    var direction = d.d;
    var playerID = d.id;
    if (playerObj[playerID].attacking) {
      if (playerObj[playerID].targetType == 'Mob') {
        var eDex = mobObj[playerObj[playerID].target].dexterity;
        if (eDex < playerObj[d.id].dexterity) {
          io.to(d.id).emit('direct', { d: 'Your dexterity is too low to flee ' + d.d });
        } else {
          if (roomsObj[playerObj[d.id].currRoom.joins[d.d]]) {
            socket.leave(playerObj[d.id].currRoom.name);
            socket.join(roomsObj[playerObj[d.id].currRoom.joins[d.d]].name);
            playerObj[d.id].move(d.d);
            socket.join(playerObj[d.id].currRoom.name);
          }
        }
      }else{
        var eDex = playerObj[playerObj[playerID].target].dexterity;
        if (eDex < playerObj[d.id].dexterity) {
          io.to(d.id).emit('direct', { d: 'Your dexterity is too low to flee ' + d.d });
        } else {
          if (roomsObj[playerObj[d.id].currRoom.joins[d.d]]) {
            socket.leave(playerObj[d.id].currRoom.name);
            socket.join(roomsObj[playerObj[d.id].currRoom.joins[d.d]].name);
            playerObj[d.id].move(d.d);
            socket.join(playerObj[d.id].currRoom.name);
          }
        }
      }
    } else {
      io.to(playerID).emit('direct', { 'd': 'There is no one to flee from', 'to': playerID })
    }
  })
  //attack
  socket.on('attack', (d) => {
    var toAttack = d.d;
    var attacking = d.id;
    attacking = playerObj[d.id];
    toAttack = search(toAttack, playerObj[d.id].currRoom.id);
    if (toAttack) {
      if (toAttack.roomID == playerObj[d.id].currRoom.id || toAttack.currRoom.id == playerObj[d.id].currRoom.id) {

        toAttack.type = toAttack.constructor.name;
        playerObj[d.id].type = playerObj[d.id].constructor.name;
        playerObj[d.id].attacking = true;


        io.to(playerObj[d.id].currRoom.name).emit('out_attack', playerObj[d.id].name + ' starts to attack ' + toAttack.display);
        startAttack(toAttack, playerObj[d.id], playerObj[d.id].currRoom.id);
      } else {
        io.to(d.id).emit('direct', { d: 'No one goes by that name in this room', to: d.id })
      }
    } else {
      io.to(d.id).emit('direct', { d: 'No one goes by that name here', to: d.id })
    }
  });
  //market
  socket.on('listings',(d)=>{
    var list = market.listings;
    list = list.map((l)=>{
      var lastBid = l.lBid.bid;
      var startBid = l.sBid;
      var timeToSale = l.timeLeft;
      var placer = l.lBid.placer;
      var seller = l.lBid.seller;
      var item = l.item.name;
      return `${item}-
  Listing by ${seller}
  Starting bid of $${startBid}
  Current bid by ${placer} for $${lastBid}
  Sale closes in ${timeToSale/1000} seconds`
    })
    io.to(d.id).emit('listings',list);
  })
})


function recharge(id) {
  var player = playerObj[id];
  if (player) {
    player.stamina += 8;
    player.stamina = Math.min(player.stamina, player.cap);
    player.health += 4;
    player.health = Math.min(player.health, player.cap);
    io.to(id).emit('stats', { to: player.id, stats: player.getStats() });
    setTimeout(() => {
      recharge(player.id);
    }, 5000);
  }
}
//socket





var p1 = new Room("An empty plain", 'Cool wind caresses the green grass. A sense of peace emanates from the rich dark soil beneath your feet', 'plains', { 'south': 'p2', 'east': 'w1' }, 0, true, 'p1');
roomsObj.p1 = p1;

var market = new Market('The market','Traders yell and hawk their wares at you.','plains',{'east':'p2'},0,true,'market')
roomsObj.market= market
var p2 = new Room("A dry plain", 'The dry grass crunches beneath your feet', 'plains', { 'north': 'p1', 'east': 'm1' ,'west':'market'}, 0, true, 'p2');
roomsObj.p2 = p2;
var w1 = new Room('A smelly waste', "Oil slick from forgotten cities litters the ground, as well as machine parts from ancient technology", 'wasteland', { 'west': 'p1', 'south': 'm1','east':'s1' }, 20, true, 'w1');
roomsObj.w1 = w1;
var m1 = new Room('A craggy cliff', 'Sheer granite faces make traveling harder.', 'mountains', { 'north': 'w1', 'west': 'p2', 'east': 'v1' }, 10, true, 'm1');
roomsObj.m1 = m1;
var v1 = new Room('A glowing volcanoe', 'This is dangerous', 'volcanoe', { 'west': 'm1','north':'s1' }, 6, true, 'v1');
roomsObj.v1 = v1;
var s1 = new Room('A muggy swamp','Wet, sticky, humid and full of bugs','swamp',{'west':'w1','south':'v1'},15,true,'s1');
roomsObj.s1 = s1;



function tickRandom() {
  var roomArray = json2array(roomsObj);
  var i = Math.floor(Math.random() * roomArray.length);
  roomArray[i].tick();
  var mobArray = json2array(mobObj);
  if (mobArray.length >= 1) {
    i = Math.floor(Math.random() * mobArray.length);
    mobArray[i].tick();
  }
  setTimeout(tickRandom, 5000);
}
tickRandom();
function startAttack(attacked, attacker, room) {
  return new Battle(attacked, attacker, room)
}

//server
app.use(express.static('static'));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
})

server.listen(3000, () => {
  console.log("We're live")
});