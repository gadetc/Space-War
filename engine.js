var Game = (function() {                                                                  
  var boards = [];
  
  // Game Initialization
  this.initialize = function(canvasElementId,sprite_data,callback) {
    this.canvas = document.getElementById(canvasElementId);
    this.width = this.canvas.width;
    this.height= this.canvas.height;
    this.pause = false;
    //设置上下文
    this.ctx = this.canvas.getContext && this.canvas.getContext('2d');
    if(!this.ctx) { return alert("Please upgrade your browser to play"); }

    this.setupInput();

    this.loop(); 

    SpriteSheet.load(sprite_data,callback);
  };

  // Handle Input
  var KEY_CODES = { 37:'left', 39:'right', 32 :'fire' ,38:'up',40:'down'};
  this.keys = {};
  this.ChangeStatus = function(){
    pause = !pause;
  }
  this.setupInput = function() {
    window.addEventListener('keydown',function(e) {
      if(KEY_CODES[(e.keyCode||e.which)]) {
       Game.keys[KEY_CODES[(e.keyCode||e.which)]] = true;
       //屏蔽默认的按钮
       e.preventDefault();
      }
    },false);

    window.addEventListener('keyup',function(e) {
      if(KEY_CODES[(e.keyCode||e.which)]) {
       Game.keys[KEY_CODES[(e.keyCode||e.which)]] = false; 
       e.preventDefault();
      }
    },false);

    window.addEventListener('keypress',function(e) {
      // console.log("click "+ e.which);
      if((e.keyCode||e.which) == 112) {
        Game.ChangeStatus();
        if(!pause){
          Game.loop();
        }
      }
    },false);
  };

  // Game Loop
  this.loop = function() { 
    var dt = 30 / 1000;
    // 每隔30ms调用一次函数
    if(!pause){
      setTimeout(Game.loop,30);
    }

    for(var i=0,len = boards.length;i<len;i++) {
      if(boards[i]) { 
        //计算视图的下一个状态
        boards[i].step(dt);
        //呈现下一个游戏的状态
        boards[i].draw(Game.ctx);
      }
    }

  };
  
  // Change an active game board
  this.setBoard = function(num,board) { boards[num] = board; };
  return this;

})();


var SpriteSheet = (function() {
  this.map = { }; 

  this.load = function(spriteData,callback) { 
    this.map = spriteData;
    this.image = new Image();
    this.image.onload = callback;
    this.image.src = 'images/mysprites.png';
  };

  this.draw = function(ctx,sprite,x,y,frame) {
    var s = this.map[sprite];
    if(!frame) frame = 0;
    ctx.drawImage(this.image,
                     s.sx + frame * s.rw, 
                     s.sy, 
                     s.rw, s.rh, 
                     Math.floor(x), Math.floor(y),
                     s.w, s.h);
  };
  return this;
})();
//开始标题
var TitleScreen = function TitleScreen(title,subtitle,callback) {
  var up = false;
  this.step = function(dt) {
    if(!Game.keys['fire']) up = true;
    if(up && Game.keys['fire'] && callback) callback();
  };

  this.draw = function(ctx) {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";

    ctx.font = "bold 40px bangers";
    ctx.fillText(title,Game.width/2,Game.height/2);

    ctx.font = "bold 20px bangers";
    ctx.fillText(subtitle,Game.width/2,Game.height/2 + 40);
  };
};
//计数提示
var ShowScreen = function ShowScreen() {
  var up = false;
  this.step = function(dt) {
    // console.log("update");
  };

  this.draw = function(ctx) {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "bold 20px bangers";
    var Numbers = "Destory enemy :" + count;
    ctx.fillText(Numbers,80,30);
  };
};
var GameBoard = function() {
  var board = this;

  // The current list of objects
  this.objects = [];
  this.cnt = {};

  // Add a new object to the object list
  this.add = function(obj) { 
    obj.board=this; 
    this.objects.push(obj); 
    this.cnt[obj.type] = (this.cnt[obj.type] || 0) + 1;
    return obj; 
  };

  // Mark an object for removal
  this.remove = function(obj) { 
    var idx = this.removed.indexOf(obj);
    if(idx == -1) {
      this.removed.push(obj); 
      return true;
    } else {
      return false;
    }
  };

  // Reset the list of removed objects
  this.resetRemoved = function() { this.removed = []; };

  // Removed an objects marked for removal from the list
  this.finalizeRemoved = function() {
    for(var i=0,len=this.removed.length;i<len;i++) {
      var idx = this.objects.indexOf(this.removed[i]);
      if(idx != -1) {
        var obj = this.removed[i];
        this.cnt[obj.type]--;
        this.objects.splice(idx,1);
        // if(obj.sy!=null){
        //   console.log("idx.sy is "+obj.sy);
        //   showDialog();
        // }
      }
    }
  };

  // Call the same method on all current objects 
  this.iterate = function(funcName) {
     var args = Array.prototype.slice.call(arguments,1);
     for(var i=0,len=this.objects.length;i<len;i++) {
       var obj = this.objects[i];
       obj[funcName].apply(obj,args);
     }
  };

  // Find the first object for which func is true
  this.detect = function(func) {
    for(var i = 0,val=null, len=this.objects.length; i < len; i++) {
      //遍历所有对象的func方法
      if(func.call(this.objects[i])) return this.objects[i];
    }
    return false;
  };

  // Call step on all objects and them delete
  // any object that have been marked for removal
  this.step = function(dt) { 
    this.resetRemoved();
    this.iterate('step',dt);
    this.finalizeRemoved();
  };

  // Draw all the objects
  this.draw= function(ctx) {
    this.iterate('draw',ctx);
  };

  // Check for a collision between the 
  // bounding rects of two objects
  this.overlap = function(o1,o2) {
    return !((o1.y+o1.h<o2.y) || (o1.y>o2.y+o2.h) ||
             (o1.x+o1.w<o2.x) || (o1.x>o2.x+o2.w));
  };

  // Find the first object that collides with obj
  // match against an optional type
  this.collide = function(obj,type) {
    return this.detect(function() {
      if(obj != this) {
       var col = (!type || this.type & type) && board.overlap(obj,this);
       //如果col为真则返回这个物体，如果假则返回false
       return col ? this : false;
      }
    });
  };


};

var Sprite = function() { };

Sprite.prototype.setup = function(sprite,props) {
  this.sprite = sprite;
  this.merge(props);
  this.frame = this.frame || 0;
  this.w =  SpriteSheet.map[sprite].w;
  this.h =  SpriteSheet.map[sprite].h;
};

//获得每个精灵的属性
Sprite.prototype.merge = function(props) {
  if(props) {
    for (var prop in props) {
      this[prop] = props[prop];
    }
  }
};

Sprite.prototype.draw = function(ctx) {
  SpriteSheet.draw(ctx,this.sprite,this.x,this.y,this.frame);
};

Sprite.prototype.hit = function(damage) {
  this.board.remove(this);
};


var Level = function(levelData,callback) {
  this.levelData = [];
  for(var i =0; i<levelData.length; i++) {
    this.levelData.push(Object.create(levelData[i]));
  }
  this.t = 0;
  this.callback = callback;
};

Level.prototype.step = function(dt) {
  var idx = 0, remove = [], curShip = null;

  // Update the current time offset
  this.t += dt * 1000;//每次30
  // console.log("time is " +this.t);
  //   Start, End,  Gap, Type,   Override
  // [ 0,     4000, 500, 'step', { x: 100 } ]
  while((curShip = this.levelData[idx]) && 
        (curShip[0] < this.t + 2000)) {
    // Check if we've passed the end time 
    if(this.t > curShip[1]) {
      remove.push(curShip);
      // console.log("remove enemy when :"+this.t)
    } else if(curShip[0] < this.t) {
      // Get the enemy definition blueprint
      var enemy = enemies[curShip[3]],
          override = curShip[4];

      // Add a new enemy with the blueprint and override
      this.board.add(new Enemy(enemy,override));
        // console.log("new enemy when :"+this.t)
      // Increment the start time by the gap
      curShip[0] += curShip[2];
    }
    idx++;
  }

  // Remove any objects from the levelData that have passed
  for(var i=0,len=remove.length;i<len;i++) {
    var remIdx = this.levelData.indexOf(remove[i]);
    if(remIdx != -1) this.levelData.splice(remIdx,1);
  }

  // If there are no more enemies on the board or in 
  // levelData, this level is done
  if(this.levelData.length === 0 && this.board.cnt[OBJECT_ENEMY] === 0) {
    if(this.callback) this.callback();
  }

};

Level.prototype.draw = function(ctx) { };
