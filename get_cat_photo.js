#!/usr/bin/env node

const fs = require('fs')
const Flickr = require('flickrapi')
const download = require('image-downloader')

const isPiped = !Boolean(process.stdout.isTTY)
const DEBUG = process.env.DEBUG_ENABLED || true

let log = function (...args) {
	if ( DEBUG && !isPiped ) {
		console.log(...args)
	}
}

let dirname = process.env.FLICKR_DEST || 'photos'

let flickrOptions = {
	api_key: process.env.FLICKR_API_KEY,
	secret: process.env.FLICKR_SECRET
}

let connect = new Promise((resolve, reject) => Flickr.tokenOnly(flickrOptions, function(error, flickr) {
	if (error) { reject(new Error(error)) }

	log('logged in', flickr.options);
	resolve(flickr)
}))

let query = process.env.FLICKR_QUERY || 'cat'
let searchOptions = {
	license: '2,3,4,5,6,9',
	safe_search: 3,
	sort: 'interestingness-desc',
	orientation: 'square',
	text: query
}

let photos = connect.then((flickr) => {
	return getPhotos(flickr, searchOptions)
})

let url = photos.then(({flickr, photos}) => {
	let index = randomIndex()
	let catPhoto = photos[ index ]

	log( 'cat photo', catPhoto )

	return getPhotoURL(flickr, catPhoto.id)
})

let photo_filename = url.then((url) => {
	return downloadPhoto(url)
})

photo_filename.catch(console.error).then(filename => {
	process.stdout.write(filename)
	log("\n")
}).then(process.exit)


function randomIndex() {
	return Math.floor(Math.random() * 100)
}

function getPhotos(flickr, searchOptions) {
	return new Promise((resolve, reject) => flickr.photos.search(searchOptions, function (err, result) {
		if(err) { reject(new Error(err)) }

		if ( !result["photos"] ) { reject(new Error("No photos returned" + result)) }

		let photos = result["photos"]["photo"]

		if ( !photos.length ) { reject(new Error("No photos returned")) }

		log( 'photos', photos.map( photo => photo.title ) )

		resolve({flickr, photos})
	}))
}

function getPhotoURL(flickr, photo_id) {
	return new Promise((resolve, reject) => flickr.photos.getSizes({ photo_id }, function (err, result) {
			log('sizes for ', photo_id, result)

			if ( !result["sizes"] || !result["sizes"]["size"]
					|| !result["sizes"]["size"].length ) { reject(new Error("No sizes returned")) }

			let sizes = result["sizes"]["size"]
			let length = sizes.length

			log('max size', sizes[ length - 1 ])

			resolve(sizes[ length - 1 ].source)
		})
	)
}

function downloadPhoto(url) {
	log('downloading photo from', url)

	const options = {
	  url: url,
	  dest: dirname
	}

	if (!fs.existsSync(dirname)) {
		fs.mkdirSync(dirname)
		log('created directory', dirname)
	}

	return download.image(options)
	  .then(({ filename, image }) => {
	    log('File saved to', filename)
			return filename
	  })
}
