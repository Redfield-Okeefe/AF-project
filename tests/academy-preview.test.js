import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAcademyPreview} from '../src/services/academy-preview.js';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:webcrypto});
const day=()=> '2026-11-25';
test('preview metrics and isolated data',async()=>{const a=createAcademyPreview(day),b=createAcademyPreview(day);assert.equal((await a.classes()).items[0].enrolled_count,4);assert.equal((await a.classes()).items[0].coach_name,'Pelatih Demo A');await a.saveClass({name:'Test',program_id:'p1',capacity:6});assert.equal((await a.classes()).items.length,4);assert.equal((await b.classes()).items.length,3);});
test('preview rejects assistant and second main coach',async()=>{const a=createAcademyPreview(day);await assert.rejects(a.addMember('c3','coaches',{coach_user_id:'co1',assignment_type:'asisten',start_date:day()}),/utama/);await assert.rejects(a.addMember('c1','coaches',{coach_user_id:'co2',assignment_type:'utama',start_date:day()}),/satu/);await a.addMember('c3','coaches',{coach_user_id:'co2',assignment_type:'utama',start_date:day()});assert.equal((await a.classes()).items.find(x=>x.id==='c3').coach_name,'Pelatih Demo B');});
