import { Entity, entity, reference, t } from '@3flows/platform';

export const Customers = entity(
    'Customer',
    Entity.base.extend({
        name: t.string(),
        phone: t.string()
    })
);

export const Appointments = entity(
    'Appointment',
    Entity.base.extend({
        at: t.string(),
        customer: reference('Customer')
    })
);
