class ObjMesh
{
	constructor()
	{
		this.vpos = [];	// vertex positions
		this.face = [];	// face vertex indices
		this.tpos = [];	// texture coordinates
		this.tfac = [];	// face texture coordinate indices
		this.norm = [];	// surface normals
		this.nfac = [];	// face surface normal indices
		this.materials = {}; // materials from MTL file
		this.faceMaterials = []; // material for each face
		this.currentMaterial = null;
	}
	
	async loadMTL(mtlUrl) {
		try {
			const response = await fetch(mtlUrl);
			const mtlData = await response.text();
			this.parseMTL(mtlData);
		} catch (error) {
			console.error('Error loading MTL file:', error);
		}
	}
	
	parseMTL(mtlData) {
		const lines = mtlData.split('\n');
		let currentMaterial = null;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			const parts = line.split(/\s+/);
			
			switch (parts[0]) {
				case 'newmtl':
					currentMaterial = parts[1];
					this.materials[currentMaterial] = {
						name: currentMaterial,
					};
					break;
				case 'Kd':
					if (currentMaterial) {
						this.materials[currentMaterial].Kd = [
							parseFloat(parts[1]),
							parseFloat(parts[2]),
							parseFloat(parts[3])
						];
					}
					break;
			}
		}
	}
	
	// Reads the obj file at the given URL and parses it.
	load( url )
	{
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				parse( this.responseText );
			}
		};
		xhttp.open("GET", url, true);
		xhttp.send();
	}
	
	// Parses the contents of an obj file.
	parse( objdata )
	{
		var lines = objdata.split('\n');
		for (var i=0; i<lines.length; ++i ) {
			var line = lines[i].trim();
			var elem = line.split(/\s+/);
			switch (elem[0]) {
				case 'mtllib':
					console.log('MTL file name:', elem[1]);
					break;
				case 'usemtl':
					this.currentMaterial = elem[1];
					break;
				case 'v':
					switch ( elem[0].length ) {
						case 1:
							this.vpos.push( [ parseFloat(elem[1]), parseFloat(elem[2]), parseFloat(elem[3]) ] );
							break;
						case 2:
							switch ( elem[0][1] ) {
								case 't':
									this.tpos.push( [ parseFloat(elem[1]), parseFloat(elem[2]) ] );
									break;
								case 'n':
									this.norm.push( [ parseFloat(elem[1]), parseFloat(elem[2]), parseFloat(elem[3]) ] );
									break;
							}
							break;
					}
					break;
				case 'vt':
					this.tpos.push( [ parseFloat(elem[1]), parseFloat(elem[2]) ] );
					break;
				case 'vn':
					this.norm.push( [ parseFloat(elem[1]), parseFloat(elem[2]), parseFloat(elem[3]) ] );
					break;
				case 'f':
					var f=[], tf=[], nf=[];
					for ( var j=1; j<elem.length; ++j ) {
						var ids = elem[j].split('/');
						var vid = parseInt(ids[0]);
						if ( vid < 0 ) vid = this.vpos.length + vid + 1;
						f.push( vid - 1 );
						if ( ids.length > 1 && ids[1] !== "" ) {
							var tid = parseInt(ids[1]);
							if ( tid < 0 ) tid = this.tpos.length + tid + 1;
							tf.push( tid - 1 );
						}
						if ( ids.length > 2 && ids[2] !== "" ) {
							var nid = parseInt(ids[2]);
							if ( nid < 0 ) nid = this.norm.length + nid + 1;
							nf.push( nid - 1 );
						}
					}
					this.face.push(f);
					if ( tf.length ) this.tfac.push(tf);
					if ( nf.length ) this.nfac.push(nf);
					this.faceMaterials.push(this.currentMaterial);
					break;
			}
		}
	}
	
	// Returns the bounding box of the object
	getBoundingBox()
	{
		if ( this.vpos.length == 0 ) return null;
		var min = [...this.vpos[0]];
		var max = [...this.vpos[0]];
		for ( var i=1; i<this.vpos.length; ++i ) {
			for ( var j=0; j<3; ++j ) {
				if ( min[j] > this.vpos[i][j] ) min[j] = this.vpos[i][j];
				if ( max[j] < this.vpos[i][j] ) max[j] = this.vpos[i][j];
			}
		}
		return { min: min, max: max };
	}
	
	shiftAndScale( shift, scale )
	{
		for ( var i=0; i<this.vpos.length; ++i ) {
			for ( var j=0; j<3; ++j ) {
				this.vpos[i][j] = (this.vpos[i][j] + shift[j]) * scale;
			}
		}
	}
	
	addTriangleToBuffers( vBuffer, tBuffer, nBuffer, fi, i, j, k )
	{
		var f  = this.face[fi];
		var tf = this.tfac[fi];
		var nf = this.nfac[fi];
		this.addTriangleToBuffer( vBuffer, this.vpos, f, i, j, k, this.addVertToBuffer3 );
		if ( tf ) {
			this.addTriangleToBuffer( tBuffer, this.tpos, tf, i, j, k, this.addVertToBuffer2 );
		}
		if ( nf ) {
			this.addTriangleToBuffer( nBuffer, this.norm, nf, i, j, k, this.addVertToBuffer3 );
		}
	}
	
	addTriangleToBuffer( buffer, v, f, i, j, k, addVert )
	{
		addVert( buffer, v, f, i );
		addVert( buffer, v, f, j );
		addVert( buffer, v, f, k );
	}
	
	addVertToBuffer3( buffer, v, f, i )
	{
		buffer.push( v[f[i]][0] );
		buffer.push( v[f[i]][1] );
		buffer.push( v[f[i]][2] );
	}

	addVertToBuffer2( buffer, v, f, i )
	{
		buffer.push( v[f[i]][0] );
		buffer.push( v[f[i]][1] );
	}

	getVertexBuffers()
	{
		var vBuffer = [];
		var tBuffer = [];
		var nBuffer = [];
		var iBuffer = [];
		var vertexCount = 0;
		
		for ( var i=0; i<this.face.length; ++i ) {
			if ( this.face[i].length < 3 ) continue;
			
			// Add first triangle
			this.addTriangleToBuffers( vBuffer, tBuffer, nBuffer, i, 0, 1, 2 );
			iBuffer.push( vertexCount, vertexCount + 1, vertexCount + 2 );
			vertexCount += 3;
			
			// Add remaining triangles (fan triangulation)
			for ( var j=3; j<this.face[i].length; ++j ) {
				this.addTriangleToBuffers( vBuffer, tBuffer, nBuffer, i, 0, j-1, j );
				iBuffer.push( vertexCount, vertexCount + 1, vertexCount + 2 );
				vertexCount += 3;
			}
		}
		
		return {
			positionBuffer: vBuffer,
			texCoordBuffer: tBuffer,
			normalBuffer: nBuffer,
			indexBuffer: iBuffer
		};
	}

	getMaterials() {
		return this.materials;
	}

	getFaceMaterial(faceIndex) {
		return this.faceMaterials[faceIndex];
	}

	getFaceMaterials() {
		return this.faceMaterials;
	}

	getVertexBuffersByMaterial() {
		const materialGroups = {};
		for (const materialName in this.materials) {
			materialGroups[materialName] = {
				vBuffer: [],
				tBuffer: [],
				nBuffer: [],
				iBuffer: [],
				vertexCount: 0
			};
		}
		for (let i = 0; i < this.face.length; i++) {
			if (this.face[i].length < 3) continue;
			
			const materialName = this.faceMaterials[i];
			const group = materialGroups[materialName];

			// making everything triangular
			this.addTriangleToBuffers(group.vBuffer, group.tBuffer, group.nBuffer, i, 0, 1, 2);
			group.iBuffer.push(group.vertexCount, group.vertexCount + 1, group.vertexCount + 2);
			group.vertexCount += 3;
			for (let j = 3; j < this.face[i].length; j++) {
				this.addTriangleToBuffers(group.vBuffer, group.tBuffer, group.nBuffer, i, 0, j-1, j);
				group.iBuffer.push(group.vertexCount, group.vertexCount + 1, group.vertexCount + 2);
				group.vertexCount += 3;
			}
		}
		
		const result = {};
		for (const materialName in materialGroups) {
			const group = materialGroups[materialName];
			if (group.vBuffer.length > 0) {
				result[materialName] = {
					positionBuffer: group.vBuffer,
					texCoordBuffer: group.tBuffer,
					normalBuffer: group.nBuffer,
					indexBuffer: group.iBuffer,
					vertexCount: group.vertexCount
				};
			}
		}
		
		return result;
	}
	
}

export { ObjMesh };