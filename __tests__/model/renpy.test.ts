import {
  androidPropertiesToString,
  RenpyAndroidProperties,
  stringToAndroidProperties
} from '../../src/model/renpy';

it.each([
  [{}, ''],
  [{ 'a.b': 'abc' }, 'a.b=abc'],
  [{ 'a.b': 'abc', b: 'c' }, 'a.b=abc\nb=c']
] as [RenpyAndroidProperties, string][])('Ensure AndroidProperties %s maps to %s', (props, str) => {
  expect(androidPropertiesToString(props)).toBe(str);
});

it.each([
  ['', {}],
  ['  a.b  =  abc  ', { 'a.b': 'abc' }],
  ['a.b  =  abc  \n  b=\tc\n \t \n', { 'a.b': 'abc', b: 'c' }]
] as [string, RenpyAndroidProperties][])('Ensure %s maps to AndroidProperties %s', (str, props) => {
  expect(stringToAndroidProperties(str)).toEqual(props);
});
