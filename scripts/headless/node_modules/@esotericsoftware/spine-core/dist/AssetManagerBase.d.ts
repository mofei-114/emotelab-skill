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
import type { Texture } from "./Texture.js";
import { TextureAtlas } from "./TextureAtlas.js";
import type { Disposable, StringMap } from "./Utils.js";
type AssetData = (Uint8Array | string | Texture | TextureAtlas | object) & Partial<Disposable>;
type AssetCallback<T extends AssetData> = (path: string, data: T) => void;
type ErrorCallback = (path: string, message: string) => void;
export type TextureLoader = (image: HTMLImageElement | ImageBitmap, pma?: boolean) => Texture;
export declare class AssetManagerBase implements Disposable {
    private textureLoader;
    private pathPrefix;
    private downloader;
    private cache;
    private errors;
    private toLoad;
    private loaded;
    private texturePmaInfo;
    constructor(textureLoader: TextureLoader, pathPrefix?: string, downloader?: Downloader, cache?: AssetCache);
    private start;
    private success;
    private error;
    loadAll(): Promise<AssetManagerBase>;
    setRawDataURI(path: string, data: string): void;
    loadBinary(path: string, success?: (path: string, binary: Uint8Array) => void, error?: (path: string, message: string) => void): void;
    loadText(path: string, success?: (path: string, text: string) => void, error?: (path: string, message: string) => void): void;
    loadJson(path: string, success?: (path: string, object: object) => void, error?: (path: string, message: string) => void): void;
    reuseAssets<T extends AssetData>(path: string, success?: AssetCallback<T>, error?: ErrorCallback): boolean;
    loadTexture(path: string, success?: AssetCallback<Texture>, error?: ErrorCallback): void;
    loadTextureAtlas(path: string, success?: AssetCallback<TextureAtlas>, error?: ErrorCallback, fileAlias?: Record<string, string>): void;
    loadTextureAtlasButNoTextures(path: string, success?: AssetCallback<TextureAtlas>, error?: ErrorCallback): void;
    loadBinaryAsync(path: string): Promise<unknown>;
    loadJsonAsync(path: string): Promise<unknown>;
    loadTextureAsync(path: string): Promise<Texture>;
    loadTextureAtlasAsync(path: string): Promise<unknown>;
    loadTextureAtlasButNoTexturesAsync(path: string): Promise<TextureAtlas>;
    setCache(cache: AssetCache): void;
    get(path: string): AssetData;
    require(path: string): AssetData;
    remove(path: string): AssetData;
    removeAll(): void;
    isLoadingComplete(): boolean;
    getToLoad(): number;
    getLoaded(): number;
    dispose(): void;
    disposeAsset(path: string): void;
    hasErrors(): boolean;
    getErrors(): StringMap<string>;
    private disposeAssetInternal;
    private createTextureAtlas;
    private createTexture;
    private texturePath;
}
export declare class AssetCache {
    assets: StringMap<AssetData>;
    assetsRefCount: StringMap<number>;
    assetsLoaded: StringMap<Promise<AssetData | undefined>>;
    static AVAILABLE_CACHES: Map<string, AssetCache>;
    static getCache(id: string): AssetCache;
    addAsset<T extends AssetData>(path: string, asset: T): Promise<T>;
    getAsset<T extends AssetData>(path: string): Promise<T> | undefined;
}
type DownloaderSuccessCallback<T extends AssetData = AssetData> = (data: T) => void;
type DownloaderErrorCallback = (status: number, responseText: string) => void;
export declare class Downloader {
    private callbacks;
    rawDataUris: StringMap<string>;
    dataUriToString(dataUri: string): string;
    base64ToUint8Array(base64: string): Uint8Array;
    dataUriToUint8Array(dataUri: string): Uint8Array;
    downloadText(url: string, success: DownloaderSuccessCallback<string>, error: DownloaderErrorCallback): void;
    downloadJson(url: string, success: DownloaderSuccessCallback<object>, error: DownloaderErrorCallback): void;
    downloadBinary(url: string, success: (data: Uint8Array) => void, error: DownloaderErrorCallback): void;
    private start;
    private finish;
}
export {};
