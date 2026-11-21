import test from 'node:test';
import assert from 'node:assert/strict';
import {hasImageSignature} from '../src/utils/image-signatures.js';

test('allows valid PNG signatures',()=>assert.equal(hasImageSignature(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]),'image/png'),true));
test('rejects SVG disguised as PNG',()=>assert.equal(hasImageSignature(new TextEncoder().encode('<svg></svg>'),'image/png'),false));
test('allows JPEG signatures',()=>assert.equal(hasImageSignature(new Uint8Array([255,216,255,1]),'image/jpeg'),true));
test('allows WebP RIFF header',()=>assert.equal(hasImageSignature(new Uint8Array([82,73,70,70,1,0,0,0,87,69,66,80]),'image/webp'),true));
test('rejects mismatched format',()=>assert.equal(hasImageSignature(new Uint8Array([255,216,255,1]),'image/png'),false));
