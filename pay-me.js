"use latest";
var mongoClient = require('mongodb').MongoClient;
 

module.exports = function (context, main, res) { 


	function sendResponse(code, data)
	{
		res.writeHead(code, { 'Content-Type': 'application/json'});
		res.end(data);
	}

	if(!context.secrets.dbUrl)
	{
		sendResponse(500, 'Storage URL not found');
	}

	// params validation
	if(context.data.mode !== '3')
	{
		if(context.data.mode === '1')
		{
			// we must validate all fields when adding / updating
			if(!context.data.name)
			{
				sendResponse(400, 'Come on, you know we need the name.');
			} else if(!context.data.qty || parseInt(context.data.qty) === 0)
			{
				sendResponse(400, 'Must indicate a valid amount.');
			}
		} else {
			if(!context.data.name)
			{
				sendResponse(400, 'Come on, you know we need the name.');
			}
		}
	}
	if(context.data.me === undefined || context.data.me === '')
	{
		return sendResponse(401, "Must indicate who you're.");
	}


	let person = context.data.name;
	let defaultOwner = context.data.me;

	var upsertDebt = function(callback) {
		mongoClient.connect(context.secrets.dbUrl, function (db_err, db) {
	    	if(db_err) return main(db_err);
			
			console.log('upsertDebt debts for: ', defaultOwner);

			var dbSet = db.collection('debts');
		  	dbSet.findOne(
		  		{ owner : defaultOwner, person: person }).then(function (doc) { 
		  			
		        if(!doc)
		        {
		        	doc = { person: person, amount: context.data.qty, owner: defaultOwner };

		        	dbSet.save(doc);
		        	db.close();
		        	return sendResponse(201, JSON.stringify(doc));
		        } else {
		        	doc.amount = parseInt(doc.amount) + parseInt(context.data.qty);

		        	dbSet.save(doc);
		        	db.close();
		        	return sendResponse(202, JSON.stringify(doc));
		        }
	  		});
	  });
	}

	var removeDebt = function() {
		mongoClient.connect(context.secrets.dbUrl, function (db_err, db) {
	    	if(db_err) return main(db_err);
			
			var dbSet = db.collection('debts');
		  	dbSet.findOne(
		  		{ owner : defaultOwner, person: person }).then(function (doc) { 
		  			
	  			console.log('trying to erase debt', doc);

		  		if(doc)
		  		{
		  			dbSet.remove(doc);
		  			db.close();
		        	return sendResponse(202, 'Well well, someone just scaped from our claws...');
		  		} else {
		  			return sendResponse(404, 'Oh! Enemy not found. Check that name and try again.');
		  		}
		        
	  		});
	  });
	}

	var printReport = function() {
		mongoClient.connect(context.secrets.dbUrl, function (db_err, db) {
	    	if(db_err) return main(db_err);
			
			console.log('Searching debts for: ', defaultOwner);

		    var collection = db.collection('debts');
		  	collection.find(
		  		{ owner : defaultOwner }, 
		  		{person: 1, amount: 1, _id: 0}).toArray(function(err, docs) {

		        if(!docs || !docs.length)
		        {
		        	db.close();
		        	return sendResponse(204);
		        }

		        db.close();
		        return sendResponse(200, JSON.stringify(docs));
	      	});
	  });
	}


	//we need to know the action
	// 1 - adding / substract | 2 - clean | 3 - printing
	switch(context.data.mode)
	{
		case '1':
			upsertDebt();
			break;
		case '2':
			removeDebt();
			break;
		// when requested or failed, we print	
		case '3':
		default:
			printReport();
			break;
	}

	console.log('execution finished...');
}