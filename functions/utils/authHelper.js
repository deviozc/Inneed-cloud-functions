const admin = require('firebase-admin');

exports.authMiddleware = (req, res, next) => {
  getProviderId(req)
    .then(({moverId, userId}) => {
      if (!moverId) {
        return Promise.reject(new Error('no provider id'));
      }
      res.locals.authData = {moverId, userId};
      return next();
    })
    .catch((error)=> {
      res.locals.error = error;
      return next();
    });
};

const getProviderId = (request) =>{
  let idToken;
  if (request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
    // Read the ID Token from the Authorization header.
    idToken = request.headers.authorization.split('Bearer ')[1];
  } else {
    // Read the ID Token from cookie.
    idToken = request.cookies && request.cookies.__session;
  }

  if(!idToken || !request.headers.provider) {
    return Promise.resolve('');
  }
  return admin.auth().verifyIdToken(idToken)
    .then((decodedToken) => {
      const uid = decodedToken.uid;
      return admin.firestore().collection('users').doc(uid).get();
    })
    .then((user) => {
      const provider = request.headers.provider;
      if (!user.data().providers[provider]) {
        Promise.reject(new Error('Invalid provider'));
      }
      return {
        moverId: request.headers.provider,
        userId: user.id
      };
    })
    .catch((error)=> {
      return Promise.reject(error);
    });
};

exports.getProviderId = getProviderId;
