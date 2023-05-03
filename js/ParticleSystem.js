/**
* @author Mark Kellogg - http://www.github.com/mkkellogg
*/

//=======================================
// Particle system
//=======================================

var PHOTONS = PHOTONS || {};

class ParticleSystem extends THREE.Object3D {

	constructor () {
		super();

		this.zSort = false;
		this.simulateInLocalSpace = true;
		this.matrixAutoUpdate = true;
	
		this.releaseAtOnce = false;
		this.releaseAtOnceCount = 0.0;
		this.hasInitialReleaseOccurred = false;
		this.isActive = false;
	
		this.atlasInitializer = ParticleSystem.DefaultInitializer;
		this.colorInitializer = ParticleSystem.DefaultInitializer;
		this.alphaInitializer = ParticleSystem.DefaultInitializer;
		this.sizeInitializer = ParticleSystem.DefaultInitializer;
		this.atlasUpdater = ParticleSystem.DefaultUpdater;
		this.colorUpdater = ParticleSystem.DefaultUpdater;
		this.alphaUpdater = ParticleSystem.DefaultUpdater;
		this.sizeUpdater = ParticleSystem.DefaultUpdater;
	
		// Particle position and position modifiers (velocity and acceleration)
		this.positionUpdater = ParticleSystem.DefaultPositionUpdater;
		this.velocityUpdater = ParticleSystem.DefaultVelocityUpdater;
		this.accelerationUpdater = ParticleSystem.DefaultUpdater;
		this.positionInitializer = ParticleSystem.DefaultInitializer;
		this.velocityInitializer = ParticleSystem.DefaultInitializer;
		this.accelerationInitializer = ParticleSystem.DefaultInitializer;
		this.customPositionTransform = null;
	
		// Particle rotation and rotation modifiers (rotational speed and rotational acceleration)
		this.rotationUpdater = ParticleSystem.DefaultRotationUpdater;
		this.rotationalSpeedUpdater = ParticleSystem.DefaultRotationalSpeedUpdater;
		this.rotationalAccelerationUpdater = ParticleSystem.DefaultUpdater;
		this.rotationInitializer = ParticleSystem.DefaultInitializer;
		this.rotationalSpeedInitializer = ParticleSystem.DefaultInitializer;
		this.rotationalAccelerationInitializer = ParticleSystem.DefaultInitializer;
	
		this.particleReleaseRate = 100;
		this.particleLifeSpan = 1.0;
		this.averageParticleLifeSpan = 1.0;
		this.calculateAverageParticleLifeSpan();
	
		this.calculateMaxParticleCount();
		this.liveParticleCount = 0;
		this.deadParticleCount = 0;
		this.liveParticleArray = [];
		this.deadParticleArray = [];
	
		this._tempParticleArray = [];
	
		this.timeSinceLastEmit = 0.0;
		this.emitting = true;
		this.age = 0.0;
		this.lifespan = 0;
	
		// temporary storage
		this._tempVector3 = new THREE.Vector3();
		this._tempQuaternion = new THREE.Quaternion();
		this._tempMatrix4 = new THREE.Matrix4();
	
	}

	calculateAverageParticleLifeSpan () {

		var total = 0.0;
	
		for ( var i = 0; i < 100; i ++ ) {
	
			total += this.particleLifeSpan;
	
		}
	
		total /= 100.0;
	
		this.averageParticleLifeSpan = total;
	
	}
	
	calculateMaxParticleCount () {
	
		if ( this.releaseAtOnce ) {
	
			this.maxParticleCount = this.releaseAtOnceCount;
	
		} else {
	
			var minLifeSpan = this.particleLifeSpan;
			if ( this.lifespan != 0 && this.lifespan < minLifeSpan ) minLifeSpan = this.lifespan;
			this.maxParticleCount = Math.max( this.particleReleaseRate * minLifeSpan * 2, 1.0 );
	
		}
	
		this.vertexCount = this.maxParticleCount * PHOTONS.Constants.VerticesPerParticle;
	
	}
	
	initializeGeometry () {
	
		this.particleGeometry = new THREE.BufferGeometry();
		var particleColor = new Float32Array( this.vertexCount * 4 );
		var particleAlpha = new Float32Array( this.vertexCount );
		var positions = new Float32Array( this.vertexCount * 3 );
		var uvs = new Float32Array( this.vertexCount * 2 );
		var size = new Float32Array( this.vertexCount * 2 );
		var rotation = new Float32Array( this.vertexCount );
		var index = new Float32Array( this.vertexCount );
	
		var particleColorAttribute = new THREE.BufferAttribute( particleColor, 4 );
		particleColorAttribute.dynamic = true;
		this.particleGeometry.setAttribute( 'customColor', particleColorAttribute );
	
		var positionAttribute = new THREE.BufferAttribute( positions, 3 );
		positionAttribute.dynamic = true;
		this.particleGeometry.setAttribute( 'position', positionAttribute );
	
		var uvAttribute = new THREE.BufferAttribute( uvs, 2 );
		uvAttribute.dynamic = true;
		this.particleGeometry.setAttribute( 'uv', uvAttribute );
	
		var sizeAttribute = new THREE.BufferAttribute( size, 2 );
		sizeAttribute.dynamic = true;
		this.particleGeometry.setAttribute( 'size', sizeAttribute );
	
		var rotationAttribute = new THREE.BufferAttribute( rotation, 1 );
		rotationAttribute.dynamic = true;
		this.particleGeometry.setAttribute( 'rotation', rotationAttribute );
	
		var indexAttribute = new THREE.BufferAttribute( index, 1 );
		indexAttribute.dynamic = true;
		this.particleGeometry.setAttribute( 'customIndex', indexAttribute );
	
	}
	
	initializeMaterial ( material ) {
	
		this.particleMaterial = material;
	
	}
	
	initializeMesh () {
	
		this.destroyMesh();
	
		this.particleMesh = new THREE.Mesh( this.particleGeometry, this.particleMaterial );
		this.particleMesh.dynamic = true;
		this.particleMesh.matrixAutoUpdate = false;
	
	}
	
	destroyMesh () {
	
		if ( this.particleMesh ) {
	
			this.scene.remove( this.particleMesh );
			this.particleMesh = undefined;
	
		}
	
	}
	
	initializeParticleArray () {
	
		for ( var i = 0; i < this.maxParticleCount; i ++ ) {
	
			var particle = this.createParticle();
			this.initializeParticle( particle );
			this.deadParticleArray[ i ] = particle;
	
		}
	
		this.liveParticleCount = 0;
		this.deadParticleCount = this.maxParticleCount;
	
		this.liveParticleArray.length = this.liveParticleCount;
		this.deadParticleArray.length = this.deadParticleCount;
	
	}
	
	mergeParameters ( parameters ) {
	
		for ( var key in parameters ) {
	
			this[ key ] = parameters[ key ];
	
		}
	
	}
	
	bindInitializer ( name, modifier ) {
	
		if ( name ) {
	
			this[ name + "Initializer" ] = modifier;
	
		}
	
	}
	
	bindUpdater ( name, modifier ) {
	
		if ( name ) {
	
			this[ name + "Updater" ] = modifier;
	
		}
	
	}
	
	bindModifier ( name, modifier ) {
	
		this.bindInitializer( name, modifier );
		this.bindUpdater( name, modifier );
	
	}
	
	initialize (camera, scene, parameters ) {
	
		this.camera = camera;
		this.scene = scene;
	
		this.sizeFrameSet = undefined;
		this.colorFrameSet = undefined;
		this.alphaFrameSet = undefined;
	
		if ( parameters ) {
	
			this.mergeParameters ( parameters );
	
		}
	
		if ( ! this.sizeFrameSet ) this.sizeFrameSet = new PHOTONS.FrameSet();
		if ( ! this.colorFrameSet ) this.colorFrameSet = new PHOTONS.FrameSet();
		if ( ! this.alphaFrameSet ) this.alphaFrameSet = new PHOTONS.FrameSet();
	
		this.liveParticleArray = [];
		this.timeSinceLastEmit = 0.0;
		this.age = 0.0;
		this.emitting = true;
	
		this.calculateAverageParticleLifeSpan();
		this.calculateMaxParticleCount();
		this.initializeParticleArray();
	
		this.initializeGeometry();
		this.initializeMaterial( parameters.material );
		this.updateAttributesWithParticleData();
		this.initializeMesh();
	
	}
	
	getCameraWorldAxes = function() {
	
		var quaternion = new THREE.Quaternion();
	
		return function getCameraWorldAxes( camera, axisX, axisY, axisZ ) {
	
			camera.getWorldQuaternion( quaternion );
			axisZ.set( 0, 0, 1 ).applyQuaternion( quaternion );
			axisY.set( 0, 1, 0 ).applyQuaternion( quaternion );
			axisX.crossVectors( axisY, axisZ );
	
		};
	}();
	
	generateXYAlignedQuadForParticle = function() {
	
		var vectorX = new THREE.Vector3();
		var vectorY = new THREE.Vector3();
	
		return function generateXYAlignedQuadForParticle( particle, axisX, axisY, axisZ, pos1, pos2, pos3, pos4 ) {
	
			var position = particle.position;
			var rotation = particle.rotation;
	
			vectorX.copy( axisX );
			vectorY.copy( axisY );
	
			vectorX.multiplyScalar( Math.cos( rotation * PHOTONS.Constants.DegreesToRadians ) );
			vectorY.multiplyScalar( Math.sin( rotation * PHOTONS.Constants.DegreesToRadians ) );
	
			vectorX.addVectors( vectorX, vectorY );
			vectorY.crossVectors( axisZ, vectorX );
	
			vectorX.multiplyScalar( particle.size.x );
			vectorY.multiplyScalar( particle.size.y );
	
			pos1.subVectors( position, vectorX ).addVectors( pos1, vectorY );
			pos2.subVectors( position, vectorX ).subVectors( pos2, vectorY );
			pos3.addVectors( position, vectorX ).subVectors( pos3, vectorY );
			pos4.addVectors( position, vectorX ).addVectors( pos4, vectorY );
	
		};
	}();
	
	updateAttributesWithParticleData = function() {
	
		var vectorY = new THREE.Vector3();
		var vectorX = new THREE.Vector3();
		var vectorZ = new THREE.Vector3();
	
		var quadPos1 = new THREE.Vector3();
		var quadPos2 = new THREE.Vector3();
		var quadPos3 = new THREE.Vector3();
		var quadPos4 = new THREE.Vector3();
	
		return function updateAttributesWithParticleData() {
	
			this.getCameraWorldAxes( this.camera, vectorX, vectorY, vectorZ );
	
			this.particleMaterial.uniforms.cameraaxisx.value.copy( vectorX );
			this.particleMaterial.uniforms.cameraaxisy.value.copy( vectorY );
			this.particleMaterial.uniforms.cameraaxisz.value.copy( vectorZ );
			this.particleMaterial.uniforms.particleTexture.value = this.particleAtlas.getTexture();
	
			for ( var p = 0; p < this.liveParticleCount; p ++ ) {
	
				var particle = this.liveParticleArray[ p ];
				var position = particle.position;
	
				var baseIndex = p * PHOTONS.Constants.VerticesPerParticle;
	
				var attributePosition = this.particleGeometry.getAttribute( 'position' );
				this.updateAttributeVector3( attributePosition, baseIndex, position );
				this.updateAttributeVector3( attributePosition, baseIndex + 1, position );
				this.updateAttributeVector3( attributePosition, baseIndex + 2, position );
				this.updateAttributeVector3( attributePosition, baseIndex + 3, position );
				this.updateAttributeVector3( attributePosition, baseIndex + 4, position );
				this.updateAttributeVector3( attributePosition, baseIndex + 5, position );
	
				var imageDesc = this.particleAtlas.getImageDescriptor( particle.atlasIndex.x );
				var attributeUV = this.particleGeometry.getAttribute( 'uv' );
				this.updateAttributeVector2XY( attributeUV, baseIndex, imageDesc.left, imageDesc.top );
				this.updateAttributeVector2XY( attributeUV, baseIndex + 1, imageDesc.left, imageDesc.bottom );
				this.updateAttributeVector2XY( attributeUV, baseIndex + 2, imageDesc.right, imageDesc.top );
				this.updateAttributeVector2XY( attributeUV, baseIndex + 3, imageDesc.left, imageDesc.bottom );
				this.updateAttributeVector2XY( attributeUV, baseIndex + 4, imageDesc.right, imageDesc.bottom );
				this.updateAttributeVector2XY( attributeUV, baseIndex + 5, imageDesc.right, imageDesc.top );
	
				var color = particle.color;
				var alpha = particle.alpha.x;
				color.a = alpha;
				var size = particle.size;
				var rotation = particle.rotation.x * PHOTONS.Constants.DegreesToRadians
	
				var attributeColor = this.particleGeometry.getAttribute( 'customColor' );
				var attributeSize = this.particleGeometry.getAttribute( 'size' );
				var attributeRotation = this.particleGeometry.getAttribute( 'rotation' );
				for ( var i = 0; i < PHOTONS.Constants.VerticesPerParticle; i ++ ) {
	
					var index = baseIndex + i;
					this.updateAttributeColor( attributeColor, index, color );
					this.updateAttributeVector2XY( attributeSize, index, size.x, size.y );
					this.updateAttributeScalar( attributeRotation, index, rotation );
	
				}
	
				var attributeIndex = this.particleGeometry.getAttribute( 'customIndex' );
				this.updateAttributeScalar( attributeIndex, baseIndex, 0 );
				this.updateAttributeScalar( attributeIndex, baseIndex + 1, 1 );
				this.updateAttributeScalar( attributeIndex, baseIndex + 2, 3 );
				this.updateAttributeScalar( attributeIndex, baseIndex + 3, 1 );
				this.updateAttributeScalar( attributeIndex, baseIndex + 4, 2 );
				this.updateAttributeScalar( attributeIndex, baseIndex + 5, 3 );
	
			}
	
			if ( this.liveParticleCount > 0 ) 
				this.particleGeometry.setDrawRange( 0, PHOTONS.Constants.VerticesPerParticle * this.liveParticleCount );
	
		};
	}();
	
	updateAttributeVector2XY ( attribute, index, x, y ) {
	
		attribute.array[ index * 2 ] = x;
		attribute.array[ index * 2 + 1 ] = y;
		attribute.needsUpdate = true;
	
	}
	
	updateAttributeVector3 ( attribute, index, value ) {
	
		attribute.array[ index * 3 ] = value.x;
		attribute.array[ index * 3 + 1 ] = value.y;
		attribute.array[ index * 3 + 2 ] = value.z;
		attribute.needsUpdate = true;
	
	}
	
	updateAttributeColor ( attribute, index, value ) {
	
		attribute.array[ index * 4 ] = value.r;
		attribute.array[ index * 4 + 1 ] = value.g;
		attribute.array[ index * 4 + 2 ] = value.b;
		attribute.array[ index * 4 + 3 ] = value.a;
		attribute.needsUpdate = true;
	
	}
	
	updateAttributeScalar ( attribute, index, value ) {
	
		attribute.array[ index ] = value;
		attribute.needsUpdate = true;
	
	}
	
	createParticle () {
	
		var particle = new Particle();
		return particle;
	
	}
	
	initializeParticle ( particle ) {
	
		 this.resetParticle( particle );
	
	}
	
	resetParticle ( particle ) {
	
		particle.age = 0;
		particle.alive = 0;
	
		this.resetParticleDisplayAttributes( particle );
		this.resetParticlePositionData( particle );
		this.resetParticleRotationData( particle );
	
	}
	
	resetParticleDisplayAttributes ( particle ) {
	
		this.atlasInitializer.update( particle, particle.atlasIndex, 0 );
		this.sizeInitializer.update( particle, particle.size, 0 );
		this.colorInitializer.update( particle, particle._tempVector3, 0 );
		particle.color.setRGB( particle._tempVector3.x, particle._tempVector3.y, particle._tempVector3.z );
		this.alphaInitializer.update( particle, particle.alpha, 0 );
	
	}
	
	resetParticlePositionData ( particle ) {
	
		this.positionInitializer.update( particle, particle.position, 0 );
	
		if ( ! this.simulateInLocalSpace ) {
	
			particle._tempVector3.setFromMatrixPosition( this.matrixWorld );
			particle.position.addVectors( particle._tempVector3, particle.position );
	
		}
	
		this.velocityInitializer.update( particle, particle.velocity, 0 );
		this.accelerationInitializer.update( particle, particle.acceleration, 0 );
	
	}
	
	resetParticleRotationData ( particle ) {
	
		this.rotationInitializer.update( particle, particle.rotation );
		this.rotationalSpeedInitializer.update( particle, particle.rotationalSpeed );
		this.rotationalAccelerationInitializer.update( particle, particle.rotationalAcceleration );
	
	}
	
	advanceParticle ( particle, deltaTime ) {
	
		particle.age += deltaTime;
	
		this.advanceParticleDisplayAttributes( particle, deltaTime );
		this.advanceParticlePositionData( particle, deltaTime );
		this.advanceParticleRotationData( particle, deltaTime );
	
	}
	
	advanceParticleDisplayAttributes ( particle, deltaTime ) {
	
		this.atlasUpdater.update( particle, particle.atlasIndex, deltaTime );
		this.sizeUpdater.update( particle, particle.size, deltaTime );
		this.colorUpdater.update( particle, particle._tempVector3, deltaTime );
		particle.color.setRGB( particle._tempVector3.x, particle._tempVector3.y, particle._tempVector3.z );
		this.alphaUpdater.update( particle, particle.alpha, deltaTime );
	
	}
	
	advanceParticlePositionData ( particle, deltaTime ) {
	
		this.positionUpdater.update( particle, particle.position, deltaTime );
		if (this.customPositionTransform) particle.position.applyMatrix4(this.customPositionTransform);
	
		this.velocityUpdater.update( particle, particle.velocity, deltaTime );
		this.accelerationUpdater.update( particle, particle.acceleration, deltaTime );
	
	}
	
	advanceParticleRotationData ( particle, deltaTime ) {
	
		this.rotationUpdater.update( particle, particle.rotation, deltaTime );
		this.rotationalSpeedUpdater.update( particle, particle.rotationalSpeed, deltaTime );
		this.rotationalAccelerationUpdater.update( particle, particle.rotationalAcceleration, deltaTime );
	
	}
	
	advanceParticles ( deltaTime ) {
	
		var deadCount = 0;
	
		for ( var i = 0; i < this.liveParticleCount; i ++ )
		{
	
			var particle = this.liveParticleArray[ i ];
			this.advanceParticle( particle, deltaTime );
	
			if ( particle.age > particle.lifeSpan )
			{
	
				this.killParticle( particle );
				deadCount ++;
	
			}
	
		}
	
		if ( deadCount > 0 ) {
	
			this.cleanupDeadParticles();
	
		}
	
	}
	
	killParticle ( particle ) {
	
		particle.alive = 0.0;
	
	}
	
	activateParticle ( particle ) {
	
		this.resetParticle( particle );
		particle.lifeSpan = this.particleLifeSpan;
		particle.alive = 1.0;
	
	}
	
	cleanupDeadParticles () {
	
		var topAlive = this.liveParticleCount - 1;
		var bottomDead = 0;
		while ( topAlive > bottomDead ) {
	
			while ( this.liveParticleArray[ topAlive ].alive == 0.0 && topAlive > 0 ) {
	
				topAlive --;
	
			}
	
			while ( this.liveParticleArray[ bottomDead ].alive == 1.0 && bottomDead < this.liveParticleCount - 1 ) {
	
				bottomDead ++;
	
			}
	
			if ( topAlive <= bottomDead ) {
	
				break;
	
			}
	
			var swap = this.liveParticleArray[ bottomDead ];
			this.liveParticleArray[ bottomDead ] = this.liveParticleArray[ topAlive ];
			this.liveParticleArray[ topAlive ] = swap;
	
		}
	
		while ( this.liveParticleCount > 0 && this.liveParticleArray[ this.liveParticleCount - 1 ].alive == 0.0 ) {
	
			this.deadParticleArray[ this.deadParticleCount ] = this.liveParticleArray[ this.liveParticleCount - 1 ];
			this.deadParticleCount ++;
			this.liveParticleCount --;
	
		}
	
		this.liveParticleArray.length = this.liveParticleCount;
		this.deadParticleArray.length = this.deadParticleCount;
	
	}
	
	sortParticleArray = function() {
	
		function numericalSort( a, b ) {
	
			return a[ 0 ] - b[ 0 ];
	
		};
	
		var _sortParticleArray = [];
		var projectedPosition = new THREE.Vector3();
	
		return function sortParticleArray( mvpMatrix ) {
	
			for ( var p = 0; p < this.liveParticleCount; p ++ ) {
	
				var position = this.liveParticleArray[ p ].position;
				projectedPosition.copy( position );
				projectedPosition.applyMatrix4( mvpMatrix );
	
				if ( ! _sortParticleArray[ p ] ) {
	
					_sortParticleArray[ p ] = [ 0, 0 ];
	
				}
	
				_sortParticleArray[ p ][ 0 ] = projectedPosition.z;
				_sortParticleArray[ p ][ 1 ] = p;
	
			}
	
			_sortParticleArray.length = this.liveParticleCount;
			_sortParticleArray.sort( numericalSort );
	
			for ( p = 0; p < this.liveParticleCount; p ++ ) {
	
				var originalIndex = _sortParticleArray[ p ][ 1 ];
				this._tempParticleArray[ p ] = this.liveParticleArray[ originalIndex ];
	
			}
	
			this._tempParticleArray.length = this.liveParticleCount;
	
			var temp = this.liveParticleArray;
			this.liveParticleArray = this._tempParticleArray;
			this._tempParticleArray = temp;
	
		};
	}();
	
	activateParticles ( count ) {
	
		for ( var i = 0; i < count; i ++ ) {
	
			if ( this.liveParticleCount < this.maxParticleCount && this.deadParticleCount > 0 ) {
	
				var newParticle = this.deadParticleArray[ this.deadParticleCount - 1 ];
				this.liveParticleArray[ this.liveParticleCount ] = newParticle;
				this.deadParticleCount --;
				this.liveParticleCount ++;
	
				this.activateParticle ( newParticle );
	
			} else {
	
				break;
	
			}
	
		}
	
		this.liveParticleArray.length = this.liveParticleCount;
		this.deadParticleArray.length = this.deadParticleCount;
	
	}
	
	update = function() {
	
		var tempMatrix4 = new THREE.Matrix4();
	
		return function update( deltaTime ) {
	
			if ( ! this.isActive )return;
	
			if (this.emitting) {
	
				this.timeSinceLastEmit += deltaTime;
	
				if ( this.releaseAtOnce ) {
	
					var waitTime = this.averageParticleLifeSpan;
	
					if ( ! this.hasInitialReleaseOccurred || ( this.timeSinceLastEmit > waitTime && this.liveParticleCount <= 0 ) ) {
	
						this.activateParticles( this.maxParticleCount );
						this.timeSinceLastEmit = 0.0;
						this.hasInitialReleaseOccurred = true;
	
					}
	
				} else {
	
					var emitUnitTime = 1.0 / this.particleReleaseRate;
					if ( ! this.hasInitialReleaseOccurred || this.timeSinceLastEmit > emitUnitTime ) {
	
						var releaseCount = Math.max( 1, Math.floor( this.timeSinceLastEmit / emitUnitTime ) );
						this.activateParticles( releaseCount );
						this.timeSinceLastEmit = 0.0;
						this.hasInitialReleaseOccurred = true;
	
					}
	
				}
			}
	
			this.advanceParticles( deltaTime );
	
			if ( this.zSort ) {
	
				this.camera.updateMatrixWorld();
				tempMatrix4.copy( this.camera.matrixWorld );
				tempMatrix4.copy( tempMatrix4 ).invert();
				this.sortParticleArray( tempMatrix4 );
	
			}
	
			this.updateAttributesWithParticleData();
	
			this.age += deltaTime;
			if ( this.lifespan != 0 && this.age > this.lifespan ) {
	
				 this.emitting = false;
	
			}
	
			if ( this.simulateInLocalSpace ) {
	
				this.particleMesh.matrix.copy( this.matrixWorld );
				this.particleMesh.updateMatrixWorld();
	
			}
	
		};
	}();
	
	deactivate () {
	
		if ( this.isActive ) {
	
			this.scene.remove( this.particleMesh );
			this.isActive = false;
	
		}
	
	}
	
	activate () {
	
		if ( ! this.isActive ) {
	
			this.scene.add( this.particleMesh );
			this.isActive = true;
	
		}
	
	}
	
	setCustomPositionTransform (transform) {
	
		if (transform) this.customPositionTransform = new THREE.Matrix4().copy(transform);
		else this.customPositionTransform = null;
	
	}

	static createMaterial ( vertexShader, fragmentShader, customUniforms, useWebGL2, useLogarithmicDepth ) {

		customUniforms = customUniforms || {};
	
		customUniforms.particleTexture = { type: "t", value: null };
		customUniforms.cameraaxisx = { type: "v3", value: new THREE.Vector3() };
		customUniforms.cameraaxisy = { type: "v3", value: new THREE.Vector3() };
		customUniforms.cameraaxisz = { type: "v3", value: new THREE.Vector3() };
	
		vertexShader = vertexShader || ParticleSystem.Shader.getVertexShader(useLogarithmicDepth);
		fragmentShader = fragmentShader || ParticleSystem.Shader.getFragmentShader(useWebGL2, useLogarithmicDepth);
	
		return new THREE.ShaderMaterial(
		{
			uniforms: customUniforms,
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
	
			transparent: true,
			alphaTest: 0.5,
	
			blending: THREE.NormalBlending,
	
			depthTest: true,
			depthWrite: false
		} );
	
	}

	static get DefaultPositionUpdater() {

		return {
	
			update : function( particle, target, deltaTime ) {

				particle._tempVector3.copy( particle.velocity );
				particle._tempVector3.multiplyScalar( deltaTime );
				particle.position.add( particle._tempVector3 );

			}

		};
	}

	static get DefaultVelocityUpdater() {

		return {

			update : function( particle, target, deltaTime ) {

				particle._tempVector3.copy( particle.acceleration );
				particle._tempVector3.multiplyScalar( deltaTime );
				particle.velocity.add( particle._tempVector3 );

			}

		};
	}

	static get DefaultRotationUpdater() {

		return {

			update : function( particle, target, deltaTime ) {

				particle.rotation.set( particle.rotation.x += particle.rotationalSpeed.x * deltaTime );

			}

		};
	}

	static get DefaultRotationalSpeedUpdater() {

		return {

			update : function( particle, target, deltaTime ) {

				particle.rotationalSpeed.set( particle.rotationalSpeed.x += particle.rotationalAcceleration.x * deltaTime );

			}

		};
	}

	static get DefaultUpdater() {

		return {

			update : function( particle, target, deltaTime ) {


			}

		};
	}

	static get DefaultInitializer() {

		return {

			update : function( particle, target, deltaTime ) {

				target.set( 0, 0, 0, 0 );

			}

		};
	}

	// Default shader
	static Shader = {

		get VertexVars() {

			return [

				"attribute vec4 customColor;",
				"attribute vec2 size;",
				"attribute float rotation;",
				"attribute float customIndex;",
				"varying vec2 vUV;",
				"varying vec4 vColor;",
				"uniform vec3 cameraaxisx;",
				"uniform vec3 cameraaxisy;",
				"uniform vec3 cameraaxisz;",
			
			].join( "\n" );
		},

		get FragmentVars() {

			return [

				"varying vec2 vUV;",
				"varying vec4 vColor;",
				"uniform sampler2D particleTexture;",
			
			].join( "\n" );
		},

		get ParticleVertexQuadPositionFunction() {

			return [

				"vec4 getQuadPosition() {",

					"vec3 axisX = cameraaxisx;",
					"vec3 axisY = cameraaxisy;",
					"vec3 axisZ = cameraaxisz;",

					"axisX *= cos( rotation );",
					"axisY *= sin( rotation );",

					"axisX += axisY;",
					"axisY = cross( axisZ, axisX );",

					"vec3 edge = vec3( 2.0, customIndex, 3.0 );",
					"vec3 test = vec3( customIndex, 0.5, customIndex );",
					"vec3 result = step( edge, test );",

					"float xFactor = -1.0 + ( result.x * 2.0 );",
					"float yFactor = -1.0 + ( result.y * 2.0 ) + ( result.z * 2.0 );",

					"axisX *= size.x * xFactor;",
					"axisY *= size.y * yFactor;",

					"return ( modelMatrix * vec4( position, 1.0 ) ) + vec4( axisX + axisY, 0.0 );",

				"}",
			
			].join( "\n" );
		},

		getVertexShader: function(useLogarithmicDepth) {
			let shader = [
				'#include <common>',
				this.VertexVars,
				this.ParticleVertexQuadPositionFunction,
			].join("\n");
		
			if (useLogarithmicDepth) shader += "  \n #include <logdepthbuf_pars_vertex> \n";
		
			shader += [
				"void main() { ",
		
					"vColor = customColor;",
					"vUV = uv;",
					"vec4 quadPos = getQuadPosition();",
					"gl_Position = projectionMatrix * viewMatrix * quadPos;",
			].join("\n");
		
			if (useLogarithmicDepth) shader += "   \n  #include <logdepthbuf_vertex> \n";
		
			shader += "} \n";
		
			return shader;
		},

		getFragmentShader: function(useWebGL2, useLogarithmicDepth) {

			let shader ='#include <common> \n' + this.FragmentVars + "\n";
		
			if (useLogarithmicDepth) shader += "  \n #include <logdepthbuf_pars_fragment> \n";
		
			shader += "void main() { \n";
		
			if (useLogarithmicDepth) shader += "    \n  #include <logdepthbuf_fragment> \n";
		
			if (this.useWebGL2) {
				shader += "vec4 textureColor = texture( particleTexture,  vUV ); \n";
			} else {
				shader += "vec4 textureColor = texture2D( particleTexture,  vUV ); \n";
			}
		
			shader += [
					"gl_FragColor = vColor * textureColor;",
				"}"
			].join( "\n" );
			return shader;
		}
	};
	
}

PHOTONS.ParticleSystem = ParticleSystem;


//=======================================
// Particle object
//=======================================

var _particle_id = 0;
class Particle {

	constructor() {

		this.id = ++_particle_id;
		this.age = 0;
		this.alive = 0;
		this.lifeSpan = 0;

		this.size = new THREE.Vector3();
		this.color = new THREE.Color();
		this.alpha = new PHOTONS.SingularVector( 0 );
		this.atlasIndex = new PHOTONS.SingularVector( 0 );

		this.position = new THREE.Vector3();
		this.velocity = new THREE.Vector3();
		this.acceleration = new THREE.Vector3();

		this.rotation = new PHOTONS.SingularVector( 0 );
		this.rotationalSpeed = new PHOTONS.SingularVector( 0 );
		this.rotationalAcceleration = new PHOTONS.SingularVector( 0 );

		this._tempVector3 = new THREE.Vector3();

	}	

}
