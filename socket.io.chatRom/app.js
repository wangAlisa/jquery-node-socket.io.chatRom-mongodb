// 引入express
var express = require("express");
// 引入formidable
var formid  = require("formidable");
// 引入fs模块
var fs = require("fs"); 
// 引入 express-session
var express_session = require("express-session");
// 引入body-parser
var body_parser = require("body-parser");
// 引入mongodb
var mongo = require("mongodb");
// 获取一个连接客户端
var mongoClient = mongo.MongoClient;
// 定义连接字符串
var connect_str = "mongodb://localhost:27017/liaotianshi";
// 定义连接的集合名称
var collection_name = "users";
// 初始化一个应用程序
var app = express();
// express-session 给req对象添加一个叫做session的属性
app.use(express_session({
	secret:"aoidhfohdsofhdsaoifh",
	resave:true,
	saveUninitialized:true
}));
// 静态化 uploads
app.use(express.static("uploads"));
// 配置body-parser
app.use(body_parser.urlencoded({extended:false}));
// 静态化
app.use(express.static("static"));
// 设置ejs模板
app.set("view engine","ejs");
// 首页  用户可以登录 可以注册 如果已经登录了直接显示登录
app.get("/",function(req,res){
	// 判断用户是否已经登录
	res.render("index.ejs",{
		 hasLogin:false,
		 userid:"",
		 username:"",
		 quanxian:"",
		 head_pic:""
	})
})
// 登录路由
app.post("/login",function(req,res){
  	// 获取前端数据
  	// var userid = req.body.userid
  	// console.log(req.body)
  	mongoClient.connect(connect_str,function(err,db){
  		if(err){
  			res.json({
  				errno:1,
  				data:"连接数据库失败"
  			});
  			return;
  		}
  		db.collection(collection_name).findOne(req.body,function(err,data){
  				if(err){
  					db.close();
  					res.json({
  						errno:1,
  						data:"查询出错"
  					})
  					return;
  				}
  				console.log(data);
  				if(data){
  					req.session.username = data.username;
  					req.session.userid = data.userid;
  					req.session.head_pic = data.head_pic ? data.head_pic  :"/default/1.png" ;
  					req.session.hasLogin = true;
  					req.session.quanxian = data.quanxian;
  					res.render("index.ejs",req.session);
  				}else{
  					req.session.username = "";
  					req.session.userid = "";
  					req.session.head_pic = "";
  					req.session.hasLogin = false;
  					req.session.quanxian = "";
  					res.render("index.ejs",req.session)
  				}
  				db.close();
  		})
  	})
})
// 检测路由
app.post("/check_name",function(req,res){
	// 获取提交过来的数据
	var check = req.body.check;
	var option = req.body[check];
	// 连接数据库
	mongoClient.connect(connect_str,function(err,db){
		if(err){
			// 因为是ajax请求 所以要返回json
			res.json({
				errno:1,
				data:"连接数据库失败"
			});
			return;
		}
		var obj = {};
		obj[check] = option;
		db.collection(collection_name).findOne(obj,function(err,data){
			if(err){
				db.close();
				res.json({
					errno:2,
					data:"查询数据库异常"
				});
				return;
			}
			// 查询成功  也分为两种情况 1 查询有结果 2 查询无结果
			if(data){
				// 查询有结果
				res.json({
					errno:3,
					data:"已经被占用"
				});
			}else{
				// 查询无结果
				res.json({
					errno:0,
					data:"可以使用"
				})
			}
			db.close();
		})
	})
})
// 注册路由
app.post("/regist",function(req,res){
	// 因为是前端携带了图片上来 所以要使用formidable
	var form = new formid.IncomingForm();
	// 设置上传图片默认保存的文件夹
	form.uploadDir =  "uploads";
	// 解析req身上的内容
	form.parse(req,function(err,fields,files){
		if(err){
			res.json({
				"errno":1,
				"data":"解析过程出错"
			});
			return;
		}
		// 将fields中的内容存储
		// 判断用户是否真的传递了图片
		if(!files.user_pic.size){
			// 没有传递内容图片 
			fs.unlink(files.user_pic.path,function(){});
			// 因为用户没有传递头像 所以给一个默认的
			// 此时不用再像相册项目那样每人建立一个文件夹 只需要在提取该用户的head_pic属性的时候判断是否有值
			fields.head_pic = "/default/1.png";
			// console.log(fields);
			// 插入到数据库中
			mongoClient.connect(connect_str,function(err,db){
				if(err){
					res.json({
						errno:2,
						data:"连接数据库出错"
					});
					return;
				}
				db.collection(collection_name).insertOne(fields,function(err,data){
					if(err){
						db.close();
						res.json({
							errno:3,
							data:"插入数据库失败"
						});
						return;
					}
					// 将信息存储到session中
					req.session.hasLogin = true;
					req.session.username = fields.username;
					req.session.head_pic = fields.head_pic;
					// 因为此时是表单提交，那么如果没有错误，最终要得到一个新的页面
					res.render("index",{
						hasLogin:req.session.hasLogin,
						username:req.session.username,
						head_pic:req.session.head_pic,
						userid:fields.userid,
						quanxian:1
					})
					db.close();
				})
			})
		}else{
			// 传递了内容图片
			// 定义一个变量 该变量的值是文件改名后的内容
			var rename = fields.username + files.user_pic.name.slice(files.user_pic.name.lastIndexOf("."))
		  fields.head_pic = rename;
			// 改名改成用户名称 直接放在uploads文件夹中
			fs.rename(files.user_pic.path,form.uploadDir+"/"+rename,function(err,data){
				if(err){
					res.json({
						errno:2,
						data:"改名失败"
					})
					return;
				}
				mongoClient.connect(connect_str,function(err,db){
				if(err){
					res.json({
						errno:2,
						data:"连接数据库出错"
					});
					return;
				}
				db.collection(collection_name).insertOne(fields,function(err,data){
					if(err){
						db.close();
						res.json({
							errno:3,
							data:"插入数据库失败"
						});
						return;
					}
					// 将信息存储到session中
					req.session.hasLogin = true;
					req.session.username = fields.username;
					req.session.head_pic = fields.head_pic;
					// 因为此时是表单提交，那么如果没有错误，最终要得到一个新的页面
					res.render("index",{
						hasLogin:req.session.hasLogin,
						username:req.session.username,
						userid:fields.userid,
						head_pic:req.session.head_pic,
						quanxian:1
					})
					db.close();
				})
			})
			})
		}

	})
}) 
// 第一步 将socket.io引入
var socket_io = require("socket.io");
// 第二步 将http模块引入
var http = require("http");
// 第三步 将app程序转成原生
var server = http.Server(app);
// 第四步 让socket_io监听server 
var io = socket_io(server);
// 第五步 让原生程序启动
server.listen(3000);
// 定义一个对象用来存储所有的已经登录的客户端信息
var allUsers = {};
var allCount = 0;
// 第七步 监听服务器 连接事件    基于观察者模式的一个事件触发机制
// 每当前端的 io对象执行 就会触发这个connection事件并执行相应的代码
io.on("connection",function(socket){
	// socket就是前端用户对象
	// console.log(socket) 
	// on 表示注册、监听的意思
	// (2) 现在前端触发了zha事件，那么后端必须要监听这个事件。然后根据业务逻辑将传递过来的数据广播给所有的已经连接的客户端
	socket.on("zha",function(data){
		// console.log(data)
		// console.log("炸")
		// 通知所有的正在连接的客户端 让他们同时干一件事
		// (3) 广播操作让所有的客户端都触发say事件 
		io.sockets.emit("say",data)
	})
  socket.on("Iamcoming",function(user){
  	// console.log(user);
  	allUsers[user.userid] = user;
  	allCount++;
  	// 给当前socket设置一个属性 
  	socket.userid = user.userid;
		console.log("有人来了,当前一共"+allCount+"人");
		// 通知所有人 有人来了
		io.sockets.emit("someonecome",allUsers)
		io.sockets.emit("welcome",user)
		// console.log(allUsers);
  });
  // 现在我们登录能够++ 但是无法监听这个客户端的离开事件
  socket.on("disconnect",function(data){
  	// 这个事件触发 代表有某个人离开了执行相应的代码
  	  // 首先你得知道是谁离开的 其次你得从allUsers中将它删除 再次你要让allCount数量--
  	  // console.log(data);
  	  allCount--;
  	  console.log(socket.userid);
  	  // 备份要走的人的信息
  	  var user = allUsers[socket.userid];
  	  // 想办法将allUsers里面的离开的人的信息给清除
  	  delete allUsers[socket.userid]
  	  console.log(allUsers);
  		console.log("有人离开了,当前一共有"+allCount+"人");
  		// 再次渲染所有人的列表
  		io.sockets.emit("someonecome",allUsers);
  		// 额外的 让所有人都知道 谁谁谁走了
  		io.sockets.emit("byebye",user)
  })
  socket.on("kick",function(userid){ 
  	// 真的将这个人的连接切断
  	io.sockets.emit("tizou",userid)

  })
})
