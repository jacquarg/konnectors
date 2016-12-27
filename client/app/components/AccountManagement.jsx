/** @jsx h */
import { h } from 'preact'
import TimeAgo from 'timeago-react'
import statefulForm from '../lib/statefulForm'

import AccountConfigForm from './AccountConfigForm'

const AccountManagement = (props) => {
  const { t, locale, name, accounts, selectedAccount, lastImport, dirty, submit, submitting } = props
  const { synchronize, deleteAccount } = props
  return (
    <div>
      <div class='account-management'>
        <div class='account-list'>
          <ul>
            {accounts.map((account, key) => (
              <li class={selectedAccount === key ? 'selected' : ''}>
                <a onClick={() => selectAccount(key)}>
                  {account.hasOwnProperty('login')
                    ? account.login
                    : t('my_accounts account index', {index: key+1})}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div class='account-config'>
          <div>
            <h3>{t('my_accounts activity')}</h3>
            <p>
              {t('my_accounts activity desc')}
              {submitting
                ? t('my_accounts activity running')
                : <TimeAgo datetime={lastImport} locale={locale} />
              }
            </p>
            <a onClick={() => synchronize()}>{t('my_accounts activity button')}</a>
          </div>
          <AccountConfigForm {...props} />
          <div>
            <h3>{t('my_accounts disconnect')}</h3>
            <p>
              {t('my_accounts disconnect desc')}
            </p>
            <button class='danger' onClick={() => deleteAccount(selectedAccount)}>
              {t('my_accounts disconnect button')}
            </button>
          </div>
        </div>
      </div>
      <div class='account-management-controls'>
        <button class='cancel'>
          {t('my_accounts account cancel button')}
        </button>
        <button
          disabled={!dirty}
          aria-busy={submitting ? 'true' : 'false'}
          onClick={submit}
        >
          {t('my_accounts account save button')}
        </button>
      </div>
    </div>
  )
}

export default statefulForm()(AccountManagement)
