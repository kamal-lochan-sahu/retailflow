import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPosRules, posRuleViolations, discountOverflow } from '../src/utils/posRules.utils.js'

const line = (o = {}) => ({ name: 'Rice', refPrice: 100, sellingPrice: 100, quantity: 2, discount: 0, discountType: 'flat', ...o })
const bill = (o = {}) => ({ discountAmount: 0, discountType: 'flat', subtotal: 200, ...o })
const V = (role, settings, lines, b) => posRuleViolations({ role, settings, lines, bill: b || bill() })

test('defaults: price locked, 10% cap', () => {
  assert.deepEqual(getPosRules(undefined), { cashierCanChangePrice: false, cashierMaxDiscountPercent: 10 })
  assert.equal(getPosRules({ pos: { cashierMaxDiscountPercent: 500 } }).cashierMaxDiscountPercent, 100)
})

test('plain sale passes for a cashier', () => assert.deepEqual(V('cashier', {}, [line()]), []))

test('cashier price change refused by default, allowed when the client enables it', () => {
  assert.equal(V('cashier', {}, [line({ sellingPrice: 90 })]).length, 1)
  assert.equal(V('cashier', { pos: { cashierCanChangePrice: true } }, [line({ sellingPrice: 90 })]).length, 0)
})

test('owner and manager are never restricted', () => {
  const l = [line({ sellingPrice: 10, discount: 90, discountType: 'percent' })]
  const b = bill({ discountAmount: 80, discountType: 'percent' })
  assert.deepEqual(V('owner', {}, l, b), [])
  assert.deepEqual(V('manager', {}, l, b), [])
  assert.ok(V('cashier', { pos: { cashierCanChangePrice: true } }, l, b).length >= 2)
})

test('item discount cap: percent and flat (flat converted to %)', () => {
  assert.equal(V('cashier', {}, [line({ discount: 10, discountType: 'percent' })]).length, 0)
  assert.equal(V('cashier', {}, [line({ discount: 11, discountType: 'percent' })]).length, 1)
  assert.equal(V('cashier', {}, [line({ discount: 20 })]).length, 0)    // 20 of 200 = 10%
  assert.equal(V('cashier', {}, [line({ discount: 21 })]).length, 1)
})

test('bill discount cap, and a custom cap', () => {
  assert.equal(V('cashier', {}, [line()], bill({ discountAmount: 20 })).length, 0)
  assert.equal(V('cashier', {}, [line()], bill({ discountAmount: 25 })).length, 1)
  assert.equal(V('cashier', { pos: { cashierMaxDiscountPercent: 0 } }, [line()], bill({ discountAmount: 1 })).length, 1)
  assert.equal(V('cashier', { pos: { cashierMaxDiscountPercent: 50 } }, [line()], bill({ discountAmount: 25, discountType: 'percent' })).length, 0)
})

test('discount can never exceed the amount (any role)', () => {
  assert.match(discountOverflow({ lines: [line({ discount: 250 })], bill: bill() }), /more than the item/)
  assert.match(discountOverflow({ lines: [line()], bill: bill({ discountAmount: 201 }) }), /more than the bill/)
  assert.match(discountOverflow({ lines: [line()], bill: bill({ discountAmount: 101, discountType: 'percent' }) }), /more than the bill/)
  assert.equal(discountOverflow({ lines: [line({ discount: 200 })], bill: bill() }), null)
})
