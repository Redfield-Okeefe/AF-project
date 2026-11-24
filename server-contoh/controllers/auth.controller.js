export function authController(auth) {
  return {
    login: async (req,res,next) => {
      try { res.set('Cache-Control','no-store'); res.json(await auth.login(req.body)); } catch (error) { next(error); }
    },
    legacyLogin: async (req,res,next) => {
      try {
        const result = await auth.login(req.body);
        // Legacy React uses player, while the database and canonical API use pemain.
        const role = result.role === 'pemain' ? 'player' : result.role;
        res.set('Cache-Control','no-store'); res.json({...result,role,user:{...result.user,role}});
      } catch(error) { next(error); }
    },
    me: (req,res) => { res.set('Cache-Control','no-store'); res.json({ok:true,user:req.user}); }
  };
}
