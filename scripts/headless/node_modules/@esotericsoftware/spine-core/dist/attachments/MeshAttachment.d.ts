/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated April 5, 2025. Replaces all prior versions.
 *
 * Copyright (c) 2013-2025, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import type { TextureRegion } from "../Texture.js";
import { Color, type NumberArrayLike } from "../Utils.js";
import { VertexAttachment } from "./Attachment.js";
import type { HasSequence } from "./HasSequence.js";
import type { Sequence } from "./Sequence.js";
/** An attachment that displays a textured mesh. A mesh has hull vertices and internal vertices within the hull. Holes are not
 * supported. Each vertex has UVs (texture coordinates) and triangles that are used to map an image on to the mesh.
 *
 * See [Mesh attachments](http://esotericsoftware.com/spine-meshes) in the Spine User Guide. */
export declare class MeshAttachment extends VertexAttachment implements HasSequence {
    readonly sequence: Sequence;
    /** The UV pair for each vertex, normalized within the texture region. */
    regionUVs: NumberArrayLike;
    /** Triplets of vertex indices which describe the mesh's triangulation. */
    triangles: Array<number>;
    /** The number of entries at the beginning of {@link vertices} that make up the mesh hull. */
    hullLength: number;
    /** The name of the texture region for this attachment. */
    path?: string;
    /** The color to tint the mesh. */
    color: Color;
    private sourceMesh;
    /** Vertex index pairs describing edges for controlling triangulation, or null if nonessential data was not exported. Mesh
     * triangles do not never cross edges. Triangulation is not performed at runtime. */
    edges: Array<number>;
    /** The width of the mesh's image. Available only when nonessential data was exported. */
    width: number;
    /** The height of the mesh's image. Available only when nonessential data was exported. */
    height: number;
    tempColor: Color;
    constructor(name: string, sequence: Sequence);
    copy(): MeshAttachment;
    updateSequence(): void;
    /** The source mesh if this is a linked mesh, else null. A linked mesh shares the {@link bones}, {@link vertices},
     * {@link regionUVs}, {@link triangles}, {@link hullLength}, {@link edges}, {@link width}, and {@link height} with the
     * source mesh, but may have a different {@link name} or {@link path}, and therefore a different texture region. */
    getSourceMesh(): MeshAttachment | null;
    setSourceMesh(sourceMesh: MeshAttachment | null): void;
    /** Returns a new mesh with the {@link sourceMesh} set to this mesh's source mesh, if any, else to this mesh. **/
    newLinkedMesh(): MeshAttachment;
    /** Computes {@link Sequence.getUVs | UVs} for a mesh attachment.
     * @param uvs Output array for the computed UVs, same length as regionUVs. */
    static computeUVs(region: TextureRegion | null, regionUVs: NumberArrayLike, uvs: NumberArrayLike): void;
}
