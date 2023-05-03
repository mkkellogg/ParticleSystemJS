/**
* @author Mark Kellogg - http://www.github.com/mkkellogg
*/

var PHOTONS = PHOTONS || {};


class Atlas {

	constructor (texture, createFirstFullFrame) {

		this.texture = texture;
		this.imageCount = 0;
		this.imageDescriptors = [];
	
		if ( createFirstFullFrame ) {
	
			this.addImageDescriptor( 0, 1, 1, 0 );
	
		}

	}

	static ImageDescriptor = class {

		constructor ( left, top, right, bottom ) {

			this.left = left;
			this.top = top;
			this.right = right;
			this.bottom = bottom;

		}
	
	};


	addImageDescriptor ( left, top, right, bottom ) {

		this.imageDescriptors[ this.imageCount ] = new Atlas.ImageDescriptor( left, top, right, bottom );
		this.imageCount ++;

	};

	getImageDescriptor ( index ) {

		return this.imageDescriptors[ index ];

	};

	getTexture () {

		return this.texture;

	};

	static createGridAtlas ( texture, left, top, right, bottom, xCount, yCount, reverseX, reverseY ) {

		var atlas = new Atlas( texture );
	
		var width = right - left;
		var height = top - bottom;
	
		var xBlockSize = width / xCount;
		var yBlockSize = height / yCount;
	
		var xInc = 1;
		var yInc = 1;
	
		var xStart = 0;
		var yStart = 0;
	
		var xFinish = xCount;
		var yFinish = yCount;
	
		if ( reverseX ) {
	
			xInc = - 1;
			xStart = xCount - 1;
			xFinish = - 1;
	
		}
	
		if ( reverseY ) {
	
			yInc = - 1;
			yStart = yCount - 1;
			yFinish = - 1;
	
		}
	
		for ( var y = yStart; y != yFinish; y += yInc ) {
	
			for ( var x = xStart; x != xFinish; x += xInc ) {
	
				var currentLeft = left + xBlockSize * x;
				var currentTop = bottom + yBlockSize * ( y + 1 );
				var currentRight = currentLeft + xBlockSize;
				var currentBottom = currentTop - yBlockSize;
	
				atlas.addImageDescriptor( currentLeft, currentTop, currentRight, currentBottom );
	
			}
	
		}
	
		return atlas;
	
	}

};

PHOTONS.Atlas = Atlas;
