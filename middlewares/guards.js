// middlewares/guards.js

function needLogin(req, res, next) {
  // 로그인 무시: 항상 통과
  return next();
}

function needAdmin(req, res, next) {
  // 관리자 체크 무시: 항상 통과
  return next();
}

// 관리자면 / 와 /me 에서 /admin 으로 보내던 로직도 비활성화하려면 next()만 호출
function redirectAdminFromMe(req, res, next) {
  return next();

  // 만약 "관리자면 자동으로 /admin으로" 보내고 싶다면 위 return next()를 지우고 아래를 사용:
  // try {
  //   if (req?.session?.user?.admin_yn === 'Y') {
  //     if (req.path === '/' || req.path === '/me') {
  //       return res.redirect('/admin');
  //     }
  //   }
  // } catch (e) {}
  // return next();
}

module.exports = { needLogin: (req,res,n)=>n(), needAdmin: (req,res,n)=>n(), redirectAdminFromMe };
