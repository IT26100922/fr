// Filters operate only on the actual bounded candidate list supplied by Java.
export function filterPeople(rows,filters={}){
  return rows.filter(user=>(!filters.interest||(user.interests||[]).some(i=>String(i.id)===String(filters.interest)&&i.rating>=3))
    &&(!filters.experience||user.experience===filters.experience)
    &&(!filters.goal||(user.goals||[]).includes(filters.goal))
    &&(!filters.collaboration||user.collaboration===filters.collaboration));
}
export const factorLabels={interests:['Shared interests',50],goals:['Shared goals',20],experience:['Experience',15],collaboration:['Collaboration style',10],activity:['Activity preference',5]};
