import { CaretRightOutlined } from '@ant-design/icons'
import { BigNumber } from '@ethersproject/bignumber'
import { Space } from 'antd'
import Modal from 'antd/lib/modal/Modal'
import CurrencySymbol from 'components/shared/CurrencySymbol'
import Loading from 'components/shared/Loading'
import { ThemeContext } from 'contexts/themeContext'
import useContractReader from 'hooks/ContractReader'
import { ContractName } from 'models/contract-name'
import { CurrencyOption } from 'models/currency-option'
import { FundingCycle } from 'models/funding-cycle'
import { useCallback, useContext, useState } from 'react'
import { deepEqFundingCycles } from 'utils/deepEqFundingCycles'
import { formatHistoricalDate } from 'utils/formatDate'
import { formatWad } from 'utils/formatNumber'

import FundingCycleDetails from '../FundingCycle/FundingCycleDetails'

export default function FundingHistory({
  startId,
}: {
  startId: BigNumber | undefined
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>()
  const [fundingCycles, setFundingCycles] = useState<FundingCycle[]>([])
  const [cycleIds, setCycleIds] = useState<BigNumber[]>([])
  const {
    theme: { colors },
  } = useContext(ThemeContext)

  if (startId?.gt(0) && !cycleIds.length) setCycleIds([startId])

  const allCyclesLoaded = fundingCycles.length >= cycleIds.length
  const cycleNumber = allCyclesLoaded
    ? undefined
    : cycleIds[cycleIds.length - 1]
  const selectedFC =
    selectedIndex !== undefined ? fundingCycles[selectedIndex] : undefined

  useContractReader<FundingCycle>({
    contract: ContractName.FundingCycles,
    functionName: 'get',
    args: cycleNumber ? [cycleNumber] : null,
    valueDidChange: (a, b) => !deepEqFundingCycles(a, b),
    callback: useCallback(
      cycle => {
        if (
          !cycle ||
          !cycleNumber ||
          cycleIds.includes(cycle.basedOn) ||
          cycle.id.eq(0)
        )
          return

        setFundingCycles([...fundingCycles, cycle])
        setCycleIds([
          ...cycleIds,
          ...(cycle.basedOn.toNumber() > 0 ? [cycle.basedOn] : []),
        ])
      },
      [cycleNumber, cycleIds, fundingCycles],
    ),
  })

  const fundingCycleElems = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {fundingCycles.length ? (
        fundingCycles.map((cycle, i) => (
          <div
            key={cycle.id.toString()}
            onClick={() => setSelectedIndex(i)}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              cursor: 'pointer',
              ...(i < fundingCycles.length - 1
                ? {
                    paddingBottom: 20,
                    borderBottom: '1px solid ' + colors.stroke.tertiary,
                  }
                : {}),
            }}
          >
            <Space align="baseline">
              <h3>#{cycle.number.toString()}</h3>

              <div style={{ fontSize: '.8rem', marginLeft: 10 }}>
                <CurrencySymbol
                  currency={cycle.currency.toNumber() as CurrencyOption}
                />
                {formatWad(cycle.tapped)}/{formatWad(cycle.target)} withdrawn
              </div>
            </Space>

            <div style={{ flex: 1 }}></div>

            <Space align="baseline" style={{ fontSize: '.8rem' }}>
              {formatHistoricalDate(
                cycle.start.add(cycle.duration).mul(1000).toNumber(),
              )}
              <CaretRightOutlined />
            </Space>
          </div>
        ))
      ) : (
        <div>No past funding cycles</div>
      )}
    </Space>
  )

  return (
    <div>
      {fundingCycleElems}

      {allCyclesLoaded ? null : <Loading />}

      {selectedFC && (
        <Modal
          visible={!!selectedFC}
          width={600}
          title={`Cycle #${selectedFC.number.toString()}`}
          onCancel={() => setSelectedIndex(undefined)}
          onOk={() => setSelectedIndex(undefined)}
          cancelButtonProps={{ hidden: true }}
          okText="Done"
        >
          <FundingCycleDetails fundingCycle={selectedFC} />
        </Modal>
      )}
    </div>
  )
}
