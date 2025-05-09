var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for (int i=0; i<NUM_LIGHTS; ++i) {
        vec3 lightDir = normalize(lights[i].position - position);

        // check for shadows
        Ray shadowRay;
        shadowRay.pos = position + 0.001 * normal; // Offset to avoid self-intersection
        shadowRay.dir = lightDir;

        HitInfo shadowHit;
        bool inShadow = IntersectRay(shadowHit, shadowRay);

        if (!inShadow) {
            vec3 diffuse = lights[i].intensity * max(dot(normal, lightDir), 0.0);

            float specularFactor = pow(max(dot(normal, normalize(lightDir + view)), 0.0), mtl.n);
            vec3 specular = lights[i].intensity * specularFactor;

            color += mtl.k_d * diffuse + mtl.k_s * specular;
        }
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;

    float a = dot(ray.dir, ray.dir);

	for ( int i=0; i<NUM_SPHERES; ++i ) {
        // test for ray-sphere intersection
        Sphere sphere = spheres[i];
        vec3 p_c = ray.pos - sphere.center;

        float b = 2.0 * dot(p_c, ray.dir);
        float c = dot(p_c, p_c) - sphere.radius * sphere.radius;

        float d = b * b - 4.0 * a * c;

        if (d > 0.0) {
            float t1 = (-b - sqrt(d)) / (2.0 * a);
            float t2 = (-b + sqrt(d)) / (2.0 * a);

            float closest = t1;
            if (closest < 0.0) {
                closest = t2;
            }

            if (closest > 0.0 && closest < hit.t) {
                hit.t = t1;
                hit.position = ray.pos + t1 * ray.dir;
                hit.normal = normalize(hit.position - sphere.center);
                hit.mtl = sphere.mtl;
                foundHit = true;
            }
        }
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
        vec3 reflectionColor = vec3(0.0);
		vec3 k_s = hit.mtl.k_s; // reflectionFactor
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( k_s.r + k_s.g + k_s.b <= 0.0 ) break;
			
			Ray r;
            r.pos = hit.position + 0.001 * hit.normal;
            r.dir = reflect(ray.dir, hit.normal);
			
            HitInfo h;	// reflection hit info
			if ( IntersectRay( h, r ) ) {
				// Hit found, so shade the hit point
				// Update the loop variables for tracing the next reflection ray

                vec3 viewReflection = normalize(-r.dir);
                reflectionColor += k_s * Shade(h.mtl, h.position, h.normal, viewReflection);
                k_s *= h.mtl.k_s;
                ray = r;
                hit = h;
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				reflectionColor += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;
			}
		}
		return vec4( clr + reflectionColor, 1 );
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 1.0);
	}
}
`;