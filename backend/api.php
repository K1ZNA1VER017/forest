<?php
declare(strict_types=1);
// Deploy outside the Vite public/ directory under PHP 8.2+; configure secrets only on the server.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
$secure = getenv('COOKIE_SECURE') !== '0';
session_name('forest_session');session_set_cookie_params(['httponly'=>true,'secure'=>$secure,'samesite'=>'Lax','path'=>'/']);session_start();
function reply(int $code,array $data):never {http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
$_SESSION['csrf'] ??= bin2hex(random_bytes(24));
$action=$_GET['action']??'session';$method=$_SERVER['REQUEST_METHOD'];
if($method==='POST'&&!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))reply(403,['error'=>'Недействительный CSRF-токен. Обновите страницу.']);
if($method!=='GET'&&$method!=='POST')reply(405,['error'=>'Метод не поддерживается']);
if((int)($_SERVER['CONTENT_LENGTH']??0)>262144)reply(413,['error'=>'Сохранение слишком большое']);
if($action==='session'&&$method==='GET')reply(200,['csrf'=>$_SESSION['csrf'],'email'=>$_SESSION['email']??null]);
try{
 $dsn=getenv('DB_DSN');if(!$dsn)reply(503,['error'=>'База данных не настроена на сервере']);
 $db=new PDO($dsn,getenv('DB_USER')?:null,getenv('DB_PASSWORD')?:null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $data=json_decode(file_get_contents('php://input')?:'{}',true,64,JSON_THROW_ON_ERROR);
 if(!is_array($data))reply(400,['error'=>'Ожидался JSON-объект']);
 if(in_array($action,['register','login'],true)&&$method==='POST'){
  // Session-level throttle supplements, but does not replace, proxy IP throttling.
  if(($_SESSION['auth_after']??0)>time())reply(429,['error'=>'Подождите несколько секунд']);
  $_SESSION['auth_after']=time()+2;
  $email=strtolower(trim((string)($data['email']??'')));$password=(string)($data['password']??'');
  if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254||strlen($password)<10||strlen($password)>128)reply(400,['error'=>'Введите email и пароль длиной от 10 до 128 байт']);
  if($action==='register'){
   $q=$db->prepare('INSERT INTO users(email,password_hash) VALUES(?,?)');
   try{$q->execute([$email,password_hash($password,PASSWORD_DEFAULT)]);}catch(PDOException $e){if(str_starts_with((string)$e->getCode(),'23'))reply(409,['error'=>'Не удалось зарегистрировать этот email']);throw $e;}
   $id=(int)$db->lastInsertId();
  }else{
   $q=$db->prepare('SELECT id,password_hash FROM users WHERE email=?');$q->execute([$email]);$u=$q->fetch();
   if(!$u||!password_verify($password,$u['password_hash']))reply(401,['error'=>'Неверный email или пароль']);$id=(int)$u['id'];
  }
  session_regenerate_id(true);$_SESSION['uid']=$id;$_SESSION['email']=$email;$_SESSION['csrf']=bin2hex(random_bytes(24));reply(200,['email'=>$email,'csrf'=>$_SESSION['csrf']]);
 }
 if($action==='logout'&&$method==='POST'){$_SESSION=[];session_destroy();reply(200,['ok'=>true]);}
 $uid=$_SESSION['uid']??null;if(!$uid)reply(401,['error'=>'Требуется вход']);
 if($action==='save'&&$method==='GET'){$q=$db->prepare('SELECT revision,payload FROM saves WHERE user_id=?');$q->execute([$uid]);$row=$q->fetch();reply(200,$row?['revision'=>(int)$row['revision'],'save'=>json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR)]:['revision'=>0,'save'=>null]);}
 if($action==='save'&&$method==='POST'){
  $save=$data['save']??null;$revision=$data['revision']??null;
  if(!is_int($revision)||$revision<0||!is_array($save)||!isset($save['level'],$save['zone'])||!is_numeric($save['level'])||$save['level']<1||$save['level']>1000||!in_array($save['zone'],['forest','mire','quarry','frost','hub','abyss'],true))reply(400,['error'=>'Некорректное сохранение']);
  $payload=json_encode($save,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);if(strlen($payload)>240000)reply(413,['error'=>'Сохранение слишком большое']);
  if($revision===0){try{$q=$db->prepare('INSERT INTO saves(user_id,revision,payload) VALUES(?,1,?)');$q->execute([$uid,$payload]);}catch(PDOException $e){if(str_starts_with((string)$e->getCode(),'23'))reply(409,['error'=>'Слот уже изменён. Сначала загрузите актуальную версию.']);throw $e;}}
  else{$q=$db->prepare('UPDATE saves SET payload=?,revision=revision+1 WHERE user_id=? AND revision=?');$q->execute([$payload,$uid,$revision]);if($q->rowCount()!==1)reply(409,['error'=>'Конфликт версий сохранения. Откройте аккаунт и загрузите актуальный слот.']);}
  reply(200,['revision'=>$revision+1]);
 }
 reply(404,['error'=>'Неизвестный маршрут']);
}catch(JsonException $e){reply(400,['error'=>'Некорректный JSON']);}catch(Throwable $e){error_log('Forest API: '.$e->getMessage());reply(500,['error'=>'Ошибка сервера. Подробности в серверном журнале.']);}
