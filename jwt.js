module.exports = function (RED) {
    var jwt = require('jsonwebtoken');
    var fs = require('fs');
    function JwtSign(n) {
        RED.nodes.createNode(this, n);
        this.topic = n.topic;
        this.name = n.name;
        this.payload = n.payload;
        this.alg = n.alg;
        this.exp = n.exp;
        this.secret = n.secret;
        this.key = n.key;
        this.signvar = n.signvar;
        var node = this;
        node.on('input', function (msg) {
            try {
                if (node.alg === 'RS256' ||
                        node.alg === 'RS384' ||
                        node.alg === 'RS512') {
                    node.secret = fs.readFileSync(node.key);
                }

                jwt.sign(msg[node.signvar],
                        node.secret,
                        {algorithm: node.alg, expiresIn: node.exp}, function (token) {
                    node.send({payload: token});
                });
            } catch (err) {
                node.error(err.message);
            }
        });
    }
    RED.nodes.registerType("jwt sign", JwtSign);

    function contains(a, obj) {
        for (var i = 0; i < a.length; i++) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    }

    function JwtVerify(n) {
        RED.nodes.createNode(this, n);
        this.topic = n.topic;
        this.name = n.name;
        this.payload = n.payload;
        this.alg = n.alg;
        this.secret = n.secret;
        this.key = n.key;
        this.signvar = n.signvar;
        this.storetoken = n.storetoken;
        var node = this;
        node.on('input', function (msg) {
            if (contains(node.alg, 'RS256') || contains(node.alg, 'RS384') || contains(node.alg, 'RS512')) {
                node.secret = fs.readFileSync(node.key);
            }

            if (node.signvar === 'bearer') {
                if (msg.req.headers.authorization !== undefined) {
                    msg.bearer = msg.req.headers.authorization.substring(7);
                } else if (msg.req.query.access_token !== undefined) {
                    msg.bearer = msg.req.query.access_token;
                } else if (msg.req.body !== undefined && msg.req.body.access_token !== undefined) {
                    msg.bearer = msg.req.body.access_token;
                }
            }

            jwt.verify(msg[node.signvar], node.secret, {algorithms: node.alg}, function (err, decoded) {
                if (err) {
                    msg['payload'] = err;
                    msg['statusCode'] = 401;
                    node.send([null, msg]);
                } else {
                    msg[node.storetoken] = decoded;
                    node.send([msg, null]);
                }
            });
        });
    }
    RED.nodes.registerType("jwt verify", JwtVerify);
};