import { CloseCircleOutlined, LockOutlined } from '@ant-design/icons'
import { Button, Col, DatePicker, Form, Modal, Row, Space } from 'antd'
import { useForm } from 'antd/lib/form/Form'
import { ThemeContext } from 'contexts/themeContext'
import { utils } from 'ethers'
import { TicketMod } from 'models/mods'
import * as moment from 'moment'
import { useCallback, useContext, useState } from 'react'
import { formatDate } from 'utils/formatDate'
import { fromPermyriad, parsePermyriad } from 'utils/formatNumber'

import { FormItems } from '.'
import FormattedAddress from '../FormattedAddress'
import NumberSlider from '../inputs/NumberSlider'
import { FormItemExt } from './formItemExt'
import { ProjectContext } from 'contexts/projectContext'

export default function ProjectTicketMods({
  name,
  lockedMods,
  mods,
  onModsChanged,
  formItemProps,
}: {
  lockedMods?: TicketMod[]
  mods: TicketMod[] | undefined
  onModsChanged: (mods: TicketMod[]) => void
} & FormItemExt) {
  const [form] = useForm<{
    beneficiary: string
    percent: number
    lockedUntil: moment.Moment
  }>()
  const [editingModIndex, setEditingModIndex] = useState<number>()
  const { owner } = useContext(ProjectContext)

  const {
    theme: { colors, radii },
  } = useContext(ThemeContext)

  const gutter = 10

  const modInput = useCallback(
    (mod: TicketMod, index: number, locked?: boolean) => {
      if (!mods) return

      return (
        <div
          style={{
            display: 'flex',
            padding: 10,
            border:
              '1px solid ' +
              (locked ? colors.stroke.disabled : colors.stroke.tertiary),
            borderRadius: radii.md,
          }}
          key={mod.beneficiary ?? '' + index}
        >
          <Space
            direction="vertical"
            style={{
              width: '100%',
              color: colors.text.primary,
              cursor: locked ? 'default' : 'pointer',
            }}
            onClick={() => {
              if (locked) return

              const percent = parseFloat(fromPermyriad(mod.percent))

              form.setFieldsValue({
                ...mod,
                percent,
                lockedUntil: mod.lockedUntil
                  ? moment.default(mod.lockedUntil * 1000)
                  : undefined,
              })
              setEditingModIndex(index)
            }}
          >
            <Row gutter={gutter} style={{ width: '100%' }} align="middle">
              <Col span={5}>
                <label>Address</label>{' '}
              </Col>
              <Col span={19}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ cursor: 'pointer' }}>
                    <FormattedAddress address={mod.beneficiary} />
                  </span>
                </div>
              </Col>
            </Row>

            <Row gutter={gutter} style={{ width: '100%' }} align="middle">
              <Col span={5}>
                <label>Percentage</label>
              </Col>
              <Col span={19}>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      marginRight: 10,
                      width: 100,
                      maxWidth: 100,
                    }}
                  >
                    {fromPermyriad(mod.percent)}%
                  </span>
                </div>
              </Col>
            </Row>

            {mod.lockedUntil ? (
              <Row gutter={gutter} style={{ width: '100%' }} align="middle">
                <Col span={5}>
                  <label>Locked</label>
                </Col>
                <Col span={19}>
                  until {formatDate(mod.lockedUntil * 1000, 'MM-DD-yyyy')}
                </Col>
              </Row>
            ) : null}
          </Space>

          {locked ? (
            <LockOutlined style={{ color: colors.icon.disabled }} />
          ) : (
            <Button
              type="text"
              onClick={e => {
                onModsChanged([
                  ...mods.slice(0, index),
                  ...mods.slice(index + 1),
                ])
                e.stopPropagation()
              }}
              icon={<CloseCircleOutlined />}
            />
          )}
        </div>
      )
    },
    [mods, colors, radii],
  )

  if (!mods) return null

  const total = mods.reduce(
    (acc, curr) => acc + parseFloat(fromPermyriad(curr.percent ?? '0')),
    0,
  )

  const setReceiver = async () => {
    await form.validateFields()

    const beneficiary = form.getFieldValue('beneficiary')
    const percent = parsePermyriad(form.getFieldValue('percent')).toNumber()
    const _lockedUntil = form.getFieldValue('lockedUntil') as moment.Moment

    const lockedUntil = _lockedUntil
      ? Math.round(_lockedUntil.valueOf() / 1000)
      : undefined

    const newMod = { beneficiary, percent, lockedUntil }

    onModsChanged(
      editingModIndex !== undefined && editingModIndex < mods.length
        ? mods.map((m, i) =>
            i === editingModIndex
              ? {
                  ...m,
                  ...newMod,
                }
              : m,
          )
        : [...mods, newMod],
    )

    setEditingModIndex(undefined)

    form.resetFields()
  }

  return (
    <Form.Item
      name={name}
      {...formItemProps}
      rules={[
        {
          validator: (rule: any, value: any) => {
            if (total > 100)
              return Promise.reject('Percentages must add up to less than 100%')

            return Promise.resolve()
          },
        },
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {lockedMods ? (
          <Space style={{ width: '100%' }} direction="vertical" size="small">
            {lockedMods.map((v, i) => modInput(v, i, true))}
          </Space>
        ) : null}
        <Space style={{ width: '100%' }} direction="vertical" size="small">
          {mods.map((v, i) => modInput(v, i))}
        </Space>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: colors.text.secondary,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                color: total > 100 ? colors.text.warn : colors.text.secondary,
              }}
            >
              Total:{' '}
              {total
                .toString()
                .split('.')
                .map((x, i) => (i > 0 ? x[0] : x))
                .join('.')}
              %
            </span>
          </div>
          <div>
            {100 - total}% to <FormattedAddress address={owner} />
          </div>
        </div>
        <Button
          type="dashed"
          onClick={() => {
            setEditingModIndex(mods.length)
            form.resetFields()
          }}
          block
        >
          Add token receiver
        </Button>
      </Space>

      <Modal
        title="Add token receiver"
        visible={editingModIndex !== undefined}
        onOk={setReceiver}
        onCancel={() => {
          form.resetFields()
          setEditingModIndex(undefined)
        }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onKeyDown={e => {
            if (e.key === 'Enter') setReceiver()
          }}
        >
          <FormItems.EthAddress
            name="beneficiary"
            defaultValue={form.getFieldValue('beneficiary')}
            formItemProps={{
              label: 'Beneficiary',
              extra: 'The address that should receive the tokens.',
              rules: [
                {
                  validator: (rule: any, value: any) => {
                    const address = form.getFieldValue('beneficiary')
                    if (!address || !utils.isAddress(address))
                      return Promise.reject('Address is required')
                    else return Promise.resolve()
                  },
                },
              ],
            }}
            onAddressChange={beneficiary =>
              form.setFieldsValue({ beneficiary })
            }
          />

          <Form.Item
            name="percent"
            label="Percent"
            rules={[{ required: true }]}
            shouldUpdate
          >
            <NumberSlider
              onChange={percent => form.setFieldsValue({ percent })}
              step={0.01}
              defaultValue={form.getFieldValue('percent') || 0}
              suffix="%"
            />
          </Form.Item>

          <Form.Item
            name="lockedUntil"
            label="Lock until"
            extra="If locked, this can't be edited or removed until the lock expires or the funding cycle is reconfigured."
          >
            <DatePicker />
          </Form.Item>
        </Form>
      </Modal>
    </Form.Item>
  )
}
