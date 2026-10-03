// Synthetic browser-test data only. Never loaded by the extension.
exports.seed = () => {
  if (localStorage.getItem('topics') !== null) return;
  const categories = ['Test area A', 'Test area B', 'Test area C', '14. Java (Efor: 8/10)', '15. C Programlama (Efor: 8/10)'];
  const topics = categories.flatMap((category, index) => [
    { id: `test-${index}`, title: `Test topic ${index}`, category, notes: '<p>Synthetic test fixture</p>', status: 'todo', today: false },
    { id: `test-child-${index}`, parentTopicId: `test-${index}`, title: `Test char sample ${index}`, category, notes: '<p>Synthetic test fixture</p>', status: 'todo', today: false }
  ]);
  localStorage.setItem('categories', JSON.stringify(categories));
  localStorage.setItem('topics', JSON.stringify(topics));
  localStorage.setItem('preferences', JSON.stringify({roadmapVersion:15}));
};
