export const DEMON_REALMS = [
  { min: 0, max: 2, name: '心火残念', class: 'demon-realm-1' },
  { min: 3, max: 5, name: '执念魔影', class: 'demon-realm-2' },
  { min: 6, max: 10, name: '血煞心魔', class: 'demon-realm-3' },
  { min: 11, max: 20, name: '天魔化身', class: 'demon-realm-4' },
  { min: 21, max: 9999, name: '域外真魔', class: 'demon-realm-5' }
];

export function getDemonRealmInfo(wrongCount: number) {
  const count = Number(wrongCount) || 0;
  for (const realm of DEMON_REALMS) {
    if (count >= realm.min && count <= realm.max) {
      return realm;
    }
  }
  return DEMON_REALMS[DEMON_REALMS.length - 1];
}
