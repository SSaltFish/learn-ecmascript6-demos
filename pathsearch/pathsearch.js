/*
	按下c键 进入创建障碍模式
	再次按c键 回到正常模式
	点击某一点 红点开始寻路

	缺陷：如果寻路范围太大 遍历时间会特别长
	地图初始化将所有的point和其对应的jquery dom对象 保留在了内存中 时间较长
	寻路选择具有随机性 可能会有不合理的路径 或者非最佳路径 是先到先得策略
*/
const point_side_length = 8; //一个点的边长
const map_side_length = 150; //地图的边长
const point_holder = [];	 //二位数组 保存地图
const unit = "px";			 //单位
const time_interval = 20;	 //红点移动速度
let currPoint = null;		 //红点
let endPoint = null;		 //终点

/*
	一个坐标点的对象
*/
class Point {
	constructor(x,y){
		this.x = x;
		this.y = y;
		this.locked = false;
		this.iscurrent = false;
		this.isend = false;
	}

	toString(){
		return JSON.stringify(this);
	}
	getleft(){
		let x = this.x - 1;
		if(x < 0) return null;
		return point_holder[x][this.y];
	}

	getright(){
		let x = this.x + 1;
		if(x >= map_side_length) return null;
		return point_holder[x][this.y];
	}

	gettop(){
		let y = this.y + 1;
		if(y >= map_side_length) return null;
		return point_holder[this.x][y];
	}

	getBottom(){
		let y = this.y - 1;
		if(y < 0) return null;
		return point_holder[this.x][y];
	}
}
/*
	寻路者
*/
class Finder {
	constructor(){
		this.searchedMap = new Map();
		this.pathList = [];
		this.issuccess = false;
	}

	toString(){
		return this.pathList.toString();
	}
	//清空上次路径的所有数据
	redirect(){
		this.searchedMap.clear();
		this.pathList.length = 0;
		this.issuccess = false;
		if(currPoint.parent) currPoint.parent = null; 
		this.findPath(currPoint);
	}
	//开始按照路径移动
	goingPath(){
		if(!endPoint) return;
		if(this.pathList.length == 0) return;
		let self = this;
		let timeout = window.setTimeout(function(){
			let point = self.pathList.shift();
			if(!point) return;
			if(point.iscurrent){
				point = self.pathList.shift();
			}
			setcurr(point);
			self.goingPath();
		},time_interval);
	}
	//创建路径
	buildPath(){
		let point = endPoint;
		while(point.parent){
			this.pathList.unshift(point);
			point = point.parent;
		}
		this.pathList.unshift(point);
	}
	//异步递归寻路
	findPath(point){
		let self = this;
		if(!point || this.issuccess )return;
		this.eachAround(point,p => {
			if(!p) return;
			let key = p.x + "-" + p.y;
			//不操作找过的点 当前点 障碍点
			if(this.searchedMap.has(key) || p.iscurrent || p.locked){
				return;
			}
			console.log(p.x + " , " + p.y );
			this.searchedMap.set(key,p);
			p.div.css({background:"pink"});
			p.parent = point;
			if(p.isend){
				self.issuccess = true;
				this.buildPath();
				this.goingPath();
				return;
			}
			window.setTimeout(function() {
			  self.findPath(p);
			},0);
		});
	}
	//依次操作一个点的四周
	eachAround(point,callback){
		let self = this;
		if(!point) return;
		let left = point.getleft();
		let right = point.getright();
		let top = point.gettop();
		let bottom = point.getBottom();
		let temlist = [
			left,top,right,bottom,
		]
		temlist.forEach(p => {
			if(callback){
				callback.call(self,p);
			}
		});
	}
}

const finder = new Finder();
$(function(){
	const map = $("#tabmap");
	initMap(map);

 	map.find("div").on("click",function(){
 		if(endPoint) {
 			endPoint.div.css({background:""});
 			endPoint.isend = false;
 			endPoint = null;
 		}
 		let $this = $(this);
		let datax = $this.data("x");
		let datay = $this.data("y");
 		let point = null;
 		try{
 			point = point_holder[Number(datax)][Number(datay)];
 		}catch(e){
 			console.log(e);
 		}
 		if(!point) return;
 		if(point.locked || point.iscurrent || point.isend) return;
 		endPoint = point;
 		endPoint.isend = true;
 		endPoint.div.css({background:"green"});
 		finder.redirect();
 	})
 	
 	let createBarrier = 0;
 	map.find("div").on("mouseover",function(){
 		if(!createBarrier) return;
 		let $this = $(this);
 		let datax = $this.data("x");
		let datay = $this.data("y");
		let point = null;
 		try{
 			point = point_holder[Number(datax)][Number(datay)];
 		}catch(e){
 			console.log(e);
 		}
 		if(!point || point.iscurrent || point.isend || point.locked) return;
 		point.locked = true;
 		point.div.css({background:"blue"});
 	}); 

 	
 	$("body").on("keydown",function(e){
 		if(e.key == "c"){
 			createBarrier = createBarrier ^ 1;
 		}
 	});
})

function initMap (map){
	if(!map)
		throw new Error("map not defined");
	map.css({width:(map_side_length*point_side_length)+unit,height:(map_side_length*point_side_length)+unit});
	for(let x=0;x<map_side_length;x++){
		for(let y=0;y<map_side_length;y++){
			let div = $(`
					<div data-x="${x}" data-y=${y}>
					</div>
				`);
			if(!point_holder[x]) point_holder[x] = [];
			let point = new Point(x,y);
			point.div = div;
			point_holder[x][y] = point;
			map.append(div);
			div.css({width:point_side_length+unit,height:point_side_length+unit});
		}
	}
	setcurr(point_holder[0][0]);

	//创建个障碍
	//createBarrier(20,20,30,50);
}

function createBarrier(x,xnum,y,ynum){
	for(let i=x;i<x+xnum;i++){
		for(let j=y;j<y+ynum;j++){
			point_holder[i][j].locked = true;
			point_holder[i][j].div.css({background:"blue"});
		}
	}
}

function setcurr(point){
	if(!point) return;
	if(currPoint){
		currPoint.iscurrent = false;
		currPoint.div.css({background:""});
	}
	currPoint = point;
	currPoint.div.css({background:"red"});
	currPoint.iscurrent = true;

	if(currPoint.isend) {
		currPoint.isend = false;
		endPoint = null;
	}
}