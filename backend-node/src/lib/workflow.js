// Alur approval generik: tahapan diambil dari program_step yang dibuat Admin HO.
// Pengganti stage_now / stage_next yang di-hardcode di aplikasi lama.

const FINAL_STATUS = { registration: 'active', disbursement: 'paid' };
const TABLE = { participant: 'participant', disbursement: 'disbursement' };
const PHASE = { participant: 'registration', disbursement: 'disbursement' };

function stepsOf(program, phase) {
  return program.steps.filter((s) => s.phase === phase).sort((a, b) => a.sort - b.sort || a.id - b.id);
}

// Status awal saat data diajukan. Tanpa tahapan -> langsung final (mis. toko langsung terdaftar).
function initialState(program, phase) {
  const steps = stepsOf(program, phase);
  if (!steps.length) return { status: FINAL_STATUS[phase], current_step_id: null, step: null };
  return { status: 'in_review', current_step_id: steps[0].id, step: steps[0] };
}

async function log(tx, entity, entityId, stepName, action, note, userId) {
  await tx.q(
    'INSERT INTO workflow_log (entity, entity_id, step_name, action, note, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
    [entity, entityId, stepName, action, note || null, userId]
  );
}

/**
 * Menjalankan aksi approval.
 * action: approve | reject | return
 */
async function act(tx, { entity, record, program, action, user, note }) {
  const phase = PHASE[entity];
  const steps = stepsOf(program, phase);
  const idx = steps.findIndex((s) => s.id === record.current_step_id);
  const step = steps[idx];
  if (record.status !== 'in_review' || !step) throw new Error('Data ini tidak sedang menunggu approval.');
  if (step.role !== user.role) throw new Error(`Tahap "${step.name}" hanya bisa diproses oleh role ${step.role}.`);
  if ((action === 'reject' || action === 'return') && !String(note || '').trim()) {
    throw new Error('Catatan wajib diisi untuk tolak / kembalikan.');
  }

  let status = record.status;
  let nextStep = null;
  if (action === 'approve') {
    nextStep = steps[idx + 1] || null;
    status = nextStep ? 'in_review' : FINAL_STATUS[phase];
  } else if (action === 'reject') {
    status = 'rejected';
  } else if (action === 'return') {
    status = 'returned';
  } else {
    throw new Error('Aksi tidak dikenal');
  }

  await tx.q(
    `UPDATE ${TABLE[entity]} SET status = $1, current_step_id = $2, updated_at = now() WHERE id = $3`,
    [status, nextStep ? nextStep.id : null, record.id]
  );
  await log(tx, entity, record.id, step.name, action, note, user.id);
  return { status, nextStep };
}

module.exports = { stepsOf, initialState, act, log, FINAL_STATUS };
